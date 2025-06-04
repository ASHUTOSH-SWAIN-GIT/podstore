"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";

type LiveRoomProps = {
  joinToken?: string;
  userId?: string;
  sessionId?: string;
};

const LiveRoom: React.FC<LiveRoomProps> = ({
  joinToken,
  userId: propUserId,
  sessionId: propSessionId,
}) => {
  const searchParams = useSearchParams();
  
  // Extract URL parameters
  const urlSessionId = searchParams.get('sessionId');
  const urlUserId = searchParams.get('userId');
  
  const [userId, setUserId] = useState(propUserId || urlUserId || "");
  const [sessionId, setSessionId] = useState(propSessionId || urlSessionId || "");
  const [title, setTitle] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState("");
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  const livekit = require("livekit-client");
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const room = new livekit.Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });

  function handleTrackSubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const element = track.attach();
      if (remoteVideosRef.current) {
        remoteVideosRef.current.appendChild(element);
      }
    }
  }
  function handleTrackUnsubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    track.detach();
  }
  function handleLocalTrackUnpublished(
    publication: LocalTrackPublication,
    participant: LocalParticipant
  ) {
    if (publication.track) {
      publication.track.detach();
    }
  }
  function handleDisconnect() {
    console.log("disconnected from room");
    setIsConnected(false);
    if (remoteVideosRef.current) {
      remoteVideosRef.current.innerHTML = "";
    }
    const localContainer = document.getElementById("local-video");
    if (localContainer) {
      localContainer.innerHTML = "";
    }
  }
  function handleActiveSpeakerChange(speakers: Participant[]) {
    // optional: highlight speaking participants
  }

  useEffect(() => {
    const getDevices = async () => {
      const audio = await Room.getLocalDevices("audioinput");
      const video = await Room.getLocalDevices("videoinput");
      setAudioDevices(audio);
      setVideoDevices(video);
      setSelectedAudio(audio[0]?.deviceId || "");
      setSelectedVideo(video[0]?.deviceId || "");
    };
    getDevices();
  }, []);

  // Auto-join logic
  useEffect(() => {
    const attemptAutoJoin = async () => {
      // Check if we have URL parameters and devices are ready, and we haven't attempted auto-join yet
      if (
        urlSessionId && 
        urlUserId && 
        selectedAudio && 
        selectedVideo && 
        !autoJoinAttempted && 
        !isConnected
      ) {
        console.log("Attempting auto-join...");
        setAutoJoinAttempted(true);
        setIsAutoJoining(true);
        
        try {
          const fetchedToken = await fetchToken();
          if (fetchedToken) {
            await handleConnect(fetchedToken);
            console.log("Auto-join successful!");
          }
        } catch (error) {
          console.error("Auto-join failed:", error);
        } finally {
          setIsAutoJoining(false);
        }
      }
    };

    // Only attempt auto-join if devices are loaded
    if (selectedAudio && selectedVideo) {
      attemptAutoJoin();
    }
  }, [urlSessionId, urlUserId, selectedAudio, selectedVideo, autoJoinAttempted, isConnected]);

  useEffect(() => {
    return () => {
      room.disconnect();
    };
  }, []);

  useEffect(() => {
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!room.canPlaybackAudio) {
        console.warn("Audio playback blocked by browser, user interaction required.");
      }
    });
  }, []);

  const handleConnect = async (tokenToUse: string) => {
    if (!tokenToUse) {
      alert("Token not available");
      return;
    }

    if (!url) {
      alert("LiveKit server URL not configured. Please check NEXT_PUBLIC_LIVEKIT_URL in your environment variables.");
      return;
    }

    console.log("Connecting to:", url, "with token:", tokenToUse);
    
    room.prepareConnection(url, tokenToUse);
  
    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange)
      .on(RoomEvent.Disconnected, handleDisconnect)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
      .on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication, participant: LocalParticipant) => {
        console.log("Local track published:", publication.kind);
        if (publication.kind === Track.Kind.Video && publication.track) {
          const videoEl = publication.track.attach();
          videoEl.style.width = "100%";
          videoEl.style.height = "100%";
          videoEl.style.objectFit = "cover";
          videoEl.style.borderRadius = "8px";
          
          const container = document.getElementById("local-video");
          if (container) {
            container.innerHTML = "";
            container.appendChild(videoEl);
            console.log("Local video attached via LocalTrackPublished event!");
          }
        }
      });
  
    await room.connect(url, tokenToUse);
    setIsConnected(true);
  
    const p = room.localParticipant;
    await p.setCameraEnabled(true);
    await p.setMicrophoneEnabled(true, {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });
  
    if (selectedAudio) {
      await room.switchActiveDevice("audioinput", selectedAudio);
    }
    if (selectedVideo) {
      await room.switchActiveDevice("videoinput", selectedVideo);
    }
  
    // Wait a bit for tracks to be published and then attach local video
    setTimeout(() => {
      console.log("Attempting to attach local video...");
      console.log("Local participant:", p);
      console.log("Video tracks:", p.videoTracks);
      
      if (p.videoTracks && p.videoTracks.size > 0) {
        const videoPublication = Array.from(p.videoTracks.values())[0] as LocalTrackPublication | undefined;
        console.log("Video publication:", videoPublication);
        
        const videoTrack = videoPublication?.track;
        console.log("Video track:", videoTrack);
        
        if (videoTrack) {
          const videoEl = videoTrack.attach();
          console.log("Created video element:", videoEl);
          
          const container = document.getElementById("local-video");
          console.log("Container found:", container);
          
          if (container) {
            // Clear any existing content
            container.innerHTML = "";
            
            // Style the video element
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.objectFit = "cover";
            videoEl.style.borderRadius = "8px";
            
            container.appendChild(videoEl);
            console.log("Video attached successfully!");
          } else {
            console.error("Local video container not found!");
          }
        } else {
          console.error("No video track available");
        }
      } else {
        console.error("No video tracks found. Retrying in 2 seconds...");
        // Retry after another delay
        setTimeout(() => {
          if (p.videoTracks && p.videoTracks.size > 0) {
            const videoPublication = Array.from(p.videoTracks.values())[0] as LocalTrackPublication | undefined;
            const videoTrack = videoPublication?.track;
            if (videoTrack) {
              const videoEl = videoTrack.attach();
              videoEl.style.width = "100%";
              videoEl.style.height = "100%";
              videoEl.style.objectFit = "cover";
              videoEl.style.borderRadius = "8px";
              
              const container = document.getElementById("local-video");
              if (container) {
                container.innerHTML = "";
                container.appendChild(videoEl);
                console.log("Video attached on retry!");
              }
            }
          }
        }, 2000);
      }
    }, 1000);
  };
  

  const fetchToken = async (): Promise<string | null> => {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionId }),
    });
    if (!res.ok) {
      alert("Failed to fetch token from server");
      return null;
    }
    const data = await res.json();
    setToken(data.token); // still set it for React state
    return data.token;    // return the token
  };


  const canConnect =
    userId.trim() !== "" &&
    sessionId.trim() !== "" &&
    selectedAudio !== "" &&
    selectedVideo !== "";

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {!isConnected ? (
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-2xl font-bold text-center mb-8 text-white">
              Join Live Session
            </h1>

            {(urlSessionId || urlUserId) && (
              <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded-md">
                <p className="text-blue-200 text-sm text-center">
                  {isAutoJoining ? "🔄 Auto-joining session..." : "📋 Session details filled from invite link"}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <input
                type="text"
                placeholder="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <input
                type="text"
                placeholder="Session Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Audio Device</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Audio Device ${d.deviceId}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video Device</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Video Device ${d.deviceId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!userId.trim() || !sessionId.trim()) {
                    alert("User ID or Session ID missing");
                    return;
                  }
                  const fetchedToken = await fetchToken();
                  if (!fetchedToken) {
                    alert("Failed to fetch token");
                    return;
                  }
                  await handleConnect(fetchedToken);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-white">Live Session</h1>
                <span className="text-sm text-gray-400">Session: {sessionId}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">User: {userId}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex">
            {/* Video Area */}
            <div className="flex-1 bg-gray-900 p-6">
              <div className="h-full flex items-center justify-center">
                {/* Local Video - Main View */}
                <div className="relative">
                  <div
                    id="local-video"
                    className="w-96 h-72 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden"
                  >
                    <span className="text-gray-400">Your Video</span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    You
                  </div>
                </div>
              </div>

              {/* Remote Participants Grid */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Participants</h3>
                <div
                  id="remote-videos"
                  ref={remoteVideosRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {/* Remote videos will be added here */}
                </div>
                {remoteVideosRef.current?.childElementCount === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No other participants yet</p>
                    <p className="text-sm text-gray-500 mt-2">Share the session ID to invite others</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Session Info</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Session ID:</span>
                      <span className="text-white font-mono text-sm">{sessionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your ID:</span>
                      <span className="text-white">{userId}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Invite People</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={`${window.location.origin}?sessionId=${sessionId}&userId=guest`}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}?sessionId=${sessionId}&userId=guest`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm transition"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
            <div className="flex items-center justify-center space-x-4">
              <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </button>

              <button 
                onClick={() => room.disconnect()}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414L8.586 11l-3.293 3.293a1 1 0 001.414 1.414L10 12.414l3.293 3.293a1 1 0 001.414-1.414L11.414 11l3.293-3.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRoom;
