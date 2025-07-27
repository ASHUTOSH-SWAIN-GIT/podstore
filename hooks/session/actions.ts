import { useRouter } from "next/navigation";
import { Track } from "livekit-client";
import { livekitConfig } from "@/lib/livekit-config";
import { SessionRefs } from "./types";

export const createSessionActions = (
  refs: SessionRefs,
  room: any,
  isRecording: boolean,
  isMuted: boolean,
  isVideoOff: boolean,
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
  setRecordingDuration: React.Dispatch<React.SetStateAction<number>>,
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>,
  setIsVideoOff: React.Dispatch<React.SetStateAction<boolean>>,
  setRecordingError: React.Dispatch<React.SetStateAction<string | null>>,
  recordingHandlers: any,
  ensureLocalVideoAttached: () => void
) => {
  const router = useRouter();

  const toggleRecording = async (sessionId?: string, userId?: string) => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (refs.recordingIntervalRef.current) {
        clearInterval(refs.recordingIntervalRef.current);
        refs.recordingIntervalRef.current = null;
      }
      
      recordingHandlers.stopMediaRecording();
    } else {
      // Start recording
      if (!sessionId || !userId) {
        setRecordingError("Session ID and User ID are required for recording");
        return;
      }
      
      try {
        await recordingHandlers.startMediaRecording(sessionId, userId);
        setIsRecording(true);
        
        // Start duration timer
        refs.recordingIntervalRef.current = setInterval(() => {
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
            (publication: any) => {
              if (publication.track && publication.kind === Track.Kind.Video) {
                const videoEl = publication.track.attach();
                videoEl.style.width = "100%";
                videoEl.style.height = "100%";
                videoEl.style.objectFit = "cover";
                videoEl.style.borderRadius = "12px";

                if (refs.localVideoRef.current) {
                  // Only attach if no video exists to prevent flickering
                  const existingVideo = refs.localVideoRef.current.querySelector('video');
                  if (!existingVideo) {
                    refs.localVideoRef.current.innerHTML = "";
                    refs.localVideoRef.current.appendChild(videoEl);
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

  const handleEndSession = async (sessionId?: string, userId?: string) => {
    // Stop recording if active
    if (isRecording) {
      recordingHandlers.stopMediaRecording();
    }
    
    if (refs.recordingIntervalRef.current) {
      clearInterval(refs.recordingIntervalRef.current);
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

  return {
    toggleRecording,
    toggleMute,
    toggleVideo,
    handleEndSession,
  };
};
