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
import { UploadChunkToServer } from "@/services/upload";

export const useSessionControls = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [liveParticipantCount, setLiveParticipantCount] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoAttachingRef = useRef<boolean>(false); // Prevent multiple simultaneous attachments
  
  // MediaRecorder refs for actual recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef<boolean>(false); // Flag to track if we're stopping
  const chunkIndexRef = useRef<number>(0); // Track chunk index

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
    console.log('Participant connected:', participant.identity);
    setLiveParticipantCount((prev) => prev + 1);
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
    setLiveParticipantCount((prev) => Math.max(0, prev - 1));

    // Remove the participant's video container
    if (remoteVideosRef.current) {
      const participantDiv = remoteVideosRef.current.querySelector(
        `[data-participant-id="${participant.identity}"]`,
      );
      if (participantDiv) {
        participantDiv.remove();
        console.log('Removed participant div for:', participant.identity);
      }
    }
  };

  const handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    console.log('Remote track subscribed:', track.kind, participant.identity);
    
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
          console.log('Created participant div for:', participant.identity);
        }

        // Add the media element (video or audio)
        if (track.kind === Track.Kind.Video) {
          // Remove any existing video element and add the new one
          const existingVideo = participantDiv.querySelector("video");
          if (existingVideo) {
            existingVideo.remove();
          }
          participantDiv.insertBefore(element, participantDiv.firstChild);
          console.log('Attached remote video for:', participant.identity);
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
    console.log('Local track published:', publication.kind, publication.trackSid);
    
    if (publication.kind === Track.Kind.Video && publication.track) {
      const videoEl = publication.track.attach();
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";
      videoEl.style.borderRadius = "12px";

      if (localVideoRef.current) {
        // Check if video is already attached to prevent flickering
        const existingVideo = localVideoRef.current.querySelector('video');
        if (!existingVideo) {
          // Clear any existing content and add the video element
          localVideoRef.current.innerHTML = "";
          localVideoRef.current.appendChild(videoEl);
          console.log('Local video attached successfully');
        }
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

  // Enhanced recording functions
  const startMediaRecording = async (sessionId: string, userId: string) => {
    try {
      setRecordingError(null);
      isStoppingRef.current = false; // Reset stopping flag when starting
      chunkIndexRef.current = 0; // Reset chunk index
      
      // Use the existing LiveKit stream if available, otherwise get user media
      let stream: MediaStream;
      
      if (room && room.localParticipant) {
        // Always get a separate stream for recording to avoid display conflicts
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        console.log('Using separate stream for recording to avoid display conflicts');
      } else {
        // Get user media for recording
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        console.log('Using user media stream for recording');
      }

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus", // More specific codec specification
        videoBitsPerSecond: 2500000, // 2.5 Mbps for better quality
        audioBitsPerSecond: 128000,  // 128 kbps audio
      });

      mediaRecorderRef.current.ondataavailable = async (e) => {
        console.log(`Data available - Size: ${e.data.size}, Type: ${e.data.type}`);
        
        if (e.data.size > 0) {
          chunkIndexRef.current++;
          const chunkStartTime = performance.now();
          const isFinalChunk = isStoppingRef.current;
          
          const file = new File([e.data], `chunk-${chunkIndexRef.current}-${Date.now()}.webm`, { 
            type: "video/webm" 
          });
          
          console.log(`Created file - Size: ${file.size}, Name: ${file.name}, Final: ${isFinalChunk}`);
          
          try {
            // Use userId as participantId if no specific participantId is set
            const currentParticipantId = participantId || userId;
            await UploadChunkToServer({ 
              file, 
              sessionId, 
              userId, 
              participantId: currentParticipantId,
              chunkIndex: chunkIndexRef.current,
              isFinal: isFinalChunk 
            });
            const uploadTime = performance.now() - chunkStartTime;
            console.log(`Chunk ${chunkIndexRef.current}: ${(file.size / 1024 / 1024).toFixed(2)}MB, ${uploadTime.toFixed(0)}ms, Final: ${isFinalChunk}`);
          } catch (err) {
            console.error(`Chunk ${chunkIndexRef.current} upload error:`, err);
            setRecordingError("Failed to upload recording chunk");
          }
        } else {
          console.log("Received empty data chunk");
        }
      };

      mediaRecorderRef.current.onstart = () => {
        
        // Use manual requestData() every 5 seconds for reliable chunking
        chunkIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
          }
        }, 5000); // Exactly 5 seconds
      };

      mediaRecorderRef.current.onstop = () => {
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setRecordingError("Recording error occurred");
      };

      // Start recording WITHOUT timeslice - we'll use manual requestData() instead
      mediaRecorderRef.current.start();
      
    } catch (err) {
      console.error("Failed to start media recording:", err);
      setRecordingError("Failed to access camera/microphone for recording");
      throw err;
    }
  };

  const stopMediaRecording = () => {
    // Clear the chunk interval first
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Set the stopping flag BEFORE stopping to mark the final chunk
      isStoppingRef.current = true;
      mediaRecorderRef.current.stop();
    }
    
    // Stop recording stream tracks
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
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

      // Enable camera and microphone by default for joining users
      await room.localParticipant.setCameraEnabled(
        true, // Always enable camera when joining
        livekitConfig.videoOptions,
      );
      await room.localParticipant.setMicrophoneEnabled(
        true, // Always enable microphone when joining
        livekitConfig.audioOptions,
      );

      // Update local states to reflect enabled devices
      setIsVideoOff(false);
      setIsMuted(false);

      // Manually attach any existing local video tracks immediately
      setTimeout(() => {
        room.localParticipant.videoTrackPublications.forEach((publication) => {
          if (publication.track && publication.kind === Track.Kind.Video) {
            const videoEl = publication.track.attach();
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.objectFit = "cover";
            videoEl.style.borderRadius = "12px";

            if (localVideoRef.current) {
              // Check if video is already attached to prevent flickering
              const existingVideo = localVideoRef.current.querySelector('video');
              if (!existingVideo) {
                localVideoRef.current.innerHTML = "";
                localVideoRef.current.appendChild(videoEl);
              }
            }
          }
        });
      }, 500); // Small delay to ensure tracks are published
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

  // Enhanced toggle recording with actual media recording
  const toggleRecording = async (sessionId?: string, userId?: string) => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      stopMediaRecording();
    } else {
      // Start recording
      if (!sessionId || !userId) {
        setRecordingError("Session ID and User ID are required for recording");
        return;
      }
      
      try {
        await startMediaRecording(sessionId, userId);
        setIsRecording(true);
        
        // Start duration timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setIsRecording(false);
      }
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
                  // Only attach if no video exists to prevent flickering
                  const existingVideo = localVideoRef.current.querySelector('video');
                  if (!existingVideo) {
                    localVideoRef.current.innerHTML = "";
                    localVideoRef.current.appendChild(videoEl);
                  }
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
    if (room && localVideoRef.current && room.localParticipant && !videoAttachingRef.current) {
      console.log('Attempting to attach local video...');
      console.log('Video publications:', room.localParticipant.videoTrackPublications.size);
      
      // Check if video element already exists to prevent flickering
      const existingVideo = localVideoRef.current.querySelector('video');
      if (existingVideo && existingVideo.srcObject) {
        console.log('Video element already attached, skipping reattachment to prevent flickering');
        return;
      }
      
      videoAttachingRef.current = true;
      
      room.localParticipant.videoTrackPublications.forEach((publication) => {
        console.log('Found video publication:', publication.trackSid, publication.track?.kind);
        
        if (publication.track && publication.kind === Track.Kind.Video) {
          try {
            const videoEl = publication.track.attach();
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.objectFit = "cover";
            videoEl.style.borderRadius = "12px";

            // Only clear and append if there's no existing video to prevent flickering
            if (!existingVideo && localVideoRef.current) {
              localVideoRef.current.innerHTML = "";
              localVideoRef.current.appendChild(videoEl);
              console.log('Successfully attached local video element');
            }
          } catch (error) {
            console.error('Error attaching local video:', error);
          }
        }
      });
      
      videoAttachingRef.current = false;
      
      // If no video tracks found, try to enable camera again
      if (room.localParticipant.videoTrackPublications.size === 0) {
        console.log('No video tracks found, attempting to enable camera...');
        room.localParticipant.setCameraEnabled(true, livekitConfig.videoOptions)
          .then(() => {
            console.log('Camera enabled successfully');
            // Try again after a short delay
            setTimeout(() => ensureLocalVideoAttached(), 2000);
          })
          .catch((error) => {
            console.error('Failed to enable camera:', error);
            videoAttachingRef.current = false;
          });
      }
    }
  };

  const handleEndSession = async (sessionId?: string, userId?: string) => {
    // Stop recording if active
    if (isRecording) {
      stopMediaRecording();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    // End the session in the database if we have the required info
    if (sessionId && userId) {
      try {
        console.log(`[SESSION-CONTROLS] Ending session ${sessionId} for user ${userId}`);
        const response = await fetch(`/api/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[SESSION-CONTROLS] Session ended successfully:`, result.message);
          
          if (result.processing) {
            console.log(`[SESSION-CONTROLS] Processing ${result.totalChunks} chunks`);
          }
        } else {
          const error = await response.json();
          console.error(`[SESSION-CONTROLS] Failed to end session:`, error.error);
        }
      } catch (error) {
        console.error(`[SESSION-CONTROLS] Error ending session:`, error);
      }
    }
    
    // Disconnect from room and redirect
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
      stopMediaRecording();
    };
  }, [room]);

  return {
    isRecording,
    recordingDuration,
    recordingError,
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
