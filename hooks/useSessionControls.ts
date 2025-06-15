import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Track,
  LocalTrackPublication,
  LocalParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Participant,
} from "livekit-client";
import { livekitConfig } from "@/lib/livekit-config";

export const useSessionControls = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [liveParticipantCount, setLiveParticipantCount] = useState(0);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  // Initialize LiveKit room
  useEffect(() => {
    const newRoom = new Room(livekitConfig.roomOptions);
    setRoom(newRoom);

    return () => {
      newRoom.disconnect();
    };
  }, []);

  // LiveKit event handlers
  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log("Participant connected:", participant.identity);
    setLiveParticipantCount((prev) => prev + 1);
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log("Participant disconnected:", participant.identity);
    setLiveParticipantCount((prev) => Math.max(0, prev - 1));

    // Remove the participant's video container
    if (remoteVideosRef.current) {
      const participantDiv = remoteVideosRef.current.querySelector(
        `[data-participant-id="${participant.identity}"]`,
      );
      if (participantDiv) {
        participantDiv.remove();
      }
    }
  };

  const handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const element = track.attach();
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "cover";
      element.style.borderRadius = "8px";

      if (remoteVideosRef.current) {
        // Check if participant div already exists
        let participantDiv = remoteVideosRef.current.querySelector(
          `[data-participant-id="${participant.identity}"]`,
        ) as HTMLDivElement;

        if (!participantDiv) {
          // Create new participant div
          participantDiv = document.createElement("div");
          participantDiv.className =
            "aspect-video bg-gray-900 rounded-lg border border-gray-800 relative overflow-hidden";
          participantDiv.dataset.participantId = participant.identity;

          // Add participant name badge
          const badge = document.createElement("div");
          badge.className =
            "absolute bottom-2 left-2 bg-black/50 text-white border-gray-600 text-xs px-2 py-1 rounded";
          badge.textContent = participant.identity;
          participantDiv.appendChild(badge);

          remoteVideosRef.current.appendChild(participantDiv);
        }

        // Add the media element (video or audio)
        if (track.kind === Track.Kind.Video) {
          // Remove any existing video element and add the new one
          const existingVideo = participantDiv.querySelector("video");
          if (existingVideo) {
            existingVideo.remove();
          }
          participantDiv.insertBefore(element, participantDiv.firstChild);
        }
      }
    }
  };

  const handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    track.detach();
    // Remove the participant's video container
    if (remoteVideosRef.current) {
      const participantDiv = remoteVideosRef.current.querySelector(
        `[data-participant-id="${participant.identity}"]`,
      );
      if (participantDiv) {
        participantDiv.remove();
      }
    }
  };

  const handleLocalTrackPublished = (
    publication: LocalTrackPublication,
    participant: LocalParticipant,
  ) => {
    console.log(
      "Local track published:",
      publication.kind,
      publication.trackSid,
    );
    if (publication.kind === Track.Kind.Video && publication.track) {
      const videoEl = publication.track.attach();
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";
      videoEl.style.borderRadius = "12px";

      if (localVideoRef.current) {
        // Clear any existing content and add the video element
        localVideoRef.current.innerHTML = "";
        localVideoRef.current.appendChild(videoEl);
        console.log("Local video attached to ref");
      } else {
        console.warn("localVideoRef.current is null");
      }
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setLiveParticipantCount(0);
    if (remoteVideosRef.current) {
      remoteVideosRef.current.innerHTML = "";
    }
  };

  // Connect to LiveKit room
  const connectToRoom = async (sessionId: string, userId: string) => {
    if (!room) return;

    try {
      // Get token from your API
      const tokenResponse = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId }),
      });

      const { token } = await tokenResponse.json();

      // Set up event listeners
      room
        .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        .on(RoomEvent.Disconnected, handleDisconnect);

      // Connect to room
      await room.connect(livekitConfig.serverUrl, token);
      setIsConnected(true);

      // Count existing participants after connection
      const existingParticipants = Array.from(
        room.remoteParticipants.values(),
      ).length;
      setLiveParticipantCount(existingParticipants);
      console.log(
        `Connected to room with ${existingParticipants} existing participants`,
      );

      // Enable camera and microphone
      await room.localParticipant.setCameraEnabled(
        !isVideoOff,
        livekitConfig.videoOptions,
      );
      await room.localParticipant.setMicrophoneEnabled(
        !isMuted,
        livekitConfig.audioOptions,
      );

      // Manually attach any existing local video tracks
      room.localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.kind === Track.Kind.Video) {
          const videoEl = publication.track.attach();
          videoEl.style.width = "100%";
          videoEl.style.height = "100%";
          videoEl.style.objectFit = "cover";

          if (localVideoRef.current) {
            localVideoRef.current.innerHTML = "";
            localVideoRef.current.appendChild(videoEl);
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect to room:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyInviteLink = async (session: any) => {
    if (!session) return;

    const inviteLink = `${window.location.origin}/join/${session?.joinToken}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    } else {
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const toggleMute = async () => {
    if (room) {
      const newMutedState = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(
        !newMutedState,
        livekitConfig.audioOptions,
      );
      setIsMuted(newMutedState);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (room) {
      const newVideoOffState = !isVideoOff;
      await room.localParticipant.setCameraEnabled(
        !newVideoOffState,
        livekitConfig.videoOptions,
      );
      setIsVideoOff(newVideoOffState);

      // If enabling video, manually attach any video tracks that might not have been attached
      if (!newVideoOffState) {
        setTimeout(() => {
          room.localParticipant.videoTrackPublications.forEach(
            (publication) => {
              if (publication.track && publication.kind === Track.Kind.Video) {
                const videoEl = publication.track.attach();
                videoEl.style.width = "100%";
                videoEl.style.height = "100%";
                videoEl.style.objectFit = "cover";
                videoEl.style.borderRadius = "12px";

                if (localVideoRef.current) {
                  localVideoRef.current.innerHTML = "";
                  localVideoRef.current.appendChild(videoEl);
                  console.log(
                    "Local video manually attached after enabling camera",
                  );
                }
              }
            },
          );
        }, 500); // Small delay to allow track to be published
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Manual function to ensure local video is attached
  const ensureLocalVideoAttached = () => {
    if (room && localVideoRef.current) {
      room.localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.kind === Track.Kind.Video) {
          const videoEl = publication.track.attach();
          videoEl.style.width = "100%";
          videoEl.style.height = "100%";
          videoEl.style.objectFit = "cover";
          videoEl.style.borderRadius = "12px";

          localVideoRef.current!.innerHTML = "";
          localVideoRef.current!.appendChild(videoEl);
          console.log("Local video manually ensured");
        }
      });
    }
  };

  const handleEndSession = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (room) {
      room.disconnect();
    }
    router.push("/dashboard");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    isRecording,
    recordingDuration,
    isMuted,
    isVideoOff,
    isConnected,
    localVideoRef,
    remoteVideosRef,
    room,
    liveParticipantCount,
    formatDuration,
    copyInviteLink,
    toggleRecording,
    toggleMute,
    toggleVideo,
    handleEndSession,
    connectToRoom,
    ensureLocalVideoAttached,
  };
};
