"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Settings, Check, X } from "lucide-react";
import { Room } from "livekit-client";

interface Session {
  id: string;
  title: string;
  hostId: string;
  status: string;
  createdAt: string;
  joinToken: string;
  host: {
    name: string;
    email: string;
  };
}

export default function SetupPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const token = params.token as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Device states
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  
  // Permission states
  const [cameraPermission, setCameraPermission] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [microphonePermission, setMicrophonePermission] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  
  // Media states
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isUsingHeadphones, setIsUsingHeadphones] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get device preferences from URL parameters
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  
  useEffect(() => {
    // Only access window on client side
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  // Fetch session by token
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/by-token/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Invalid or expired invite link");
          } else {
            setError("Failed to load session");
          }
          return;
        }

        const sessionData = await response.json();
        setSession(sessionData);
      } catch (err) {
        setError("Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSession();
    }
  }, [token]);

  // Check permissions and get devices
  useEffect(() => {
    const setupDevicesAndPermissions = async () => {
      try {
        // Check current permissions
        const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const microphoneStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        setCameraPermission(cameraStatus.state);
        setMicrophonePermission(microphoneStatus.state);

        // Get devices
        const audio = await Room.getLocalDevices("audioinput");
        const video = await Room.getLocalDevices("videoinput");

        setAudioDevices(audio);
        setVideoDevices(video);
        setSelectedAudio(audio[0]?.deviceId || "");
        setSelectedVideo(video[0]?.deviceId || "");

        // If permissions are granted, start media stream
        if (cameraStatus.state === 'granted' && microphoneStatus.state === 'granted') {
          await startMediaPreview();
        }
      } catch (error) {
        console.error("Failed to setup devices:", error);
      }
    };

    setupDevicesAndPermissions();
  }, []);

  const startMediaPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedVideo ? { exact: selectedVideo } : undefined },
        audio: { deviceId: selectedAudio ? { exact: selectedAudio } : undefined }
      });

      setMediaStream(stream);
      setCameraPermission('granted');
      setMicrophonePermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to get user media:", err);
      setCameraPermission('denied');
      setMicrophonePermission('denied');
    }
  };

  const requestPermissions = async () => {
    setIsRequestingPermissions(true);
    try {
      // Explicitly request both camera and microphone permissions
      // Using basic constraints to ensure maximum compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Request basic video access first
        audio: true  // Request basic audio access first
      });

      // Stop the basic stream
      stream.getTracks().forEach(track => track.stop());
      
      // Now get the stream with specific device constraints if available
      const finalStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
        audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
      });

      setMediaStream(finalStream);
      setCameraPermission('granted');
      setMicrophonePermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = finalStream;
      }

      // Refresh device list after getting permissions
      const audioDevices = await Room.getLocalDevices("audioinput");
      const videoDevices = await Room.getLocalDevices("videoinput");
      
      setAudioDevices(audioDevices);
      setVideoDevices(videoDevices);
      
      // Set default devices if none selected
      if (!selectedAudio && audioDevices.length > 0) {
        setSelectedAudio(audioDevices[0].deviceId);
      }
      if (!selectedVideo && videoDevices.length > 0) {
        setSelectedVideo(videoDevices[0].deviceId);
      }
      
    } catch (err) {
      console.error("Permission denied or error:", err);
      setCameraPermission('denied');
      setMicrophonePermission('denied');
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  const toggleCamera = () => {
    if (mediaStream) {
      const videoTracks = mediaStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMicrophone = () => {
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const changeVideoDevice = async (deviceId: string) => {
    setSelectedVideo(deviceId);
    if (mediaStream) {
      // Stop current stream
      mediaStream.getTracks().forEach(track => track.stop());
      
      // Start new stream with selected device
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: { deviceId: selectedAudio ? { exact: selectedAudio } : undefined }
        });
        
        setMediaStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Failed to change video device:", err);
      }
    }
  };

  const changeAudioDevice = async (deviceId: string) => {
    setSelectedAudio(deviceId);
    if (mediaStream) {
      // Stop current stream
      mediaStream.getTracks().forEach(track => track.stop());
      
      // Start new stream with selected device
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedVideo ? { exact: selectedVideo } : undefined },
          audio: { deviceId: { exact: deviceId } }
        });
        
        setMediaStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Failed to change audio device:", err);
      }
    }
  };

  const handleJoinSession = async () => {
    if (!session || !user) return;

    try {
      // Join the session
      const response = await fetch(`/api/sessions/${session.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: "GUEST",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to join session");
      }

      // Stop media stream before redirecting
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      // Redirect to the session with device preferences
      const sessionUrl = new URL(`/session/${session.id}`, window.location.origin);
      sessionUrl.searchParams.set('audioDevice', selectedAudio);
      sessionUrl.searchParams.set('videoDevice', selectedVideo);
      sessionUrl.searchParams.set('cameraEnabled', isCameraOn.toString());
      sessionUrl.searchParams.set('micEnabled', isMicOn.toString());
      
      router.push(sessionUrl.toString());
    } catch (err) {
      setError("Failed to join session");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading session...</p>x
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl border border-gray-200 p-8">
          <div className="text-center space-y-6">
            <div className="text-6xl">❌</div>
            <h1 className="text-2xl font-light text-black">Session Not Found</h1>
            <p className="text-gray-600">
              {error || "This session link is invalid or has expired."}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 px-4 font-light transition-colors duration-200 text-white hover:opacity-90"
              style={{ backgroundColor: '#9671ff' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl border border-gray-200 p-8">
          <div className="text-center space-y-6">
            <div className="text-6xl">🔐</div>
            <h1 className="text-2xl font-light text-black">Sign In Required</h1>
            <p className="text-gray-600">
              Please sign in to join this session.
            </p>
            <button
              onClick={() => {
                const authUrl = new URL("/auth", window.location.origin);
                authUrl.searchParams.set("returnTo", `/setup/${token}`);
                router.push(authUrl.toString());
              }}
              className="w-full py-3 px-4 font-light transition-colors duration-200 text-white hover:opacity-90"
              style={{ backgroundColor: '#9671ff' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canJoin = cameraPermission === 'granted' && microphonePermission === 'granted';

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#9671ff' }}>
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Podstore</span>
          </div>
          <div className="text-white text-sm">
            {session.host.name}'s Studio
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-gray-400 mb-2">You're about to join {session.host.name}'s Studio</p>
            <h1 className="text-3xl font-bold text-white mb-4">Let's check your cam and mic</h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left side - Video Preview */}
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 aspect-video relative overflow-hidden">
                {canJoin ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                    style={{ display: isCameraOn ? 'block' : 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <VideoOff className="w-16 h-16 text-gray-500 mx-auto" />
                      <p className="text-gray-400">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {!isCameraOn && canJoin && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <VideoOff className="w-16 h-16 text-gray-500 mx-auto" />
                      <p className="text-gray-400">Camera is off</p>
                    </div>
                  </div>
                )}

                {/* User info overlay */}
                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg">
                  <span className="text-white text-sm font-medium">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'You'}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">Host</span>
                </div>
              </div>

              {/* Device Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={toggleMicrophone}
                  disabled={!canJoin}
                  className={`p-3 rounded-lg transition-colors ${
                    isMicOn 
                      ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={toggleCamera}
                  disabled={!canJoin}
                  className={`p-3 rounded-lg transition-colors ${
                    isCameraOn 
                      ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Right side - Setup Options */}
            <div className="space-y-6">
              {/* Camera Setup */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Camera setup
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Camera</label>
                    <select 
                      value={selectedVideo} 
                      onChange={(e) => changeVideoDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Camera permission</span>
                    <div className="flex items-center space-x-2">
                      {cameraPermission === 'granted' ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : cameraPermission === 'denied' ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Setup */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Audio setup
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Microphone</label>
                    <select 
                      value={selectedAudio} 
                      onChange={(e) => changeAudioDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Microphone permission</span>
                    <div className="flex items-center space-x-2">
                      {microphonePermission === 'granted' ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : microphonePermission === 'denied' ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      )}
                    </div>
                  </div>

                 
                </div>
              </div>

              {/* Permission Request */}
              {!canJoin && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                  <h3 className="text-white font-semibold mb-4">Allow access</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    To join this session, you need to allow camera and microphone access.
                  </p>
                  <Button
                    onClick={requestPermissions}
                    disabled={isRequestingPermissions}
                    className="w-full text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#9671ff' }}
                  >
                    {isRequestingPermissions ? "Requesting access..." : "Allow all access"}
                  </Button>
                </div>
              )}

              {/* Join Button */}
              {canJoin && (
                <Button
                  onClick={handleJoinSession}
                  className="w-full text-white transition-all hover:opacity-90 py-6 text-lg"
                  style={{ backgroundColor: '#9671ff' }}
                >
                  Join session
                </Button>
              )}

             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 