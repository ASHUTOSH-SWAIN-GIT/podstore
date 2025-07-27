import {
  Track,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrackPublication,
  LocalParticipant,
} from "livekit-client";
import { SessionRefs } from "./types";

export const createEventHandlers = (
  refs: SessionRefs,
  setLiveParticipantCount: React.Dispatch<React.SetStateAction<number>>,
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>,
  connectionAttemptRef: React.MutableRefObject<boolean>
) => {
  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity);
    setLiveParticipantCount((prev) => prev + 1);
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
    setLiveParticipantCount((prev) => Math.max(0, prev - 1));

    // Remove the participant's video container
    if (refs.remoteVideosRef.current) {
      const participantDiv = refs.remoteVideosRef.current.querySelector(
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
    console.log('🔥 Remote track subscribed:', track.kind, participant.identity);
    
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      try {
        const element = track.attach();
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.objectFit = "cover";
        element.style.borderRadius = "8px";

        if (refs.remoteVideosRef.current) {
          // Check if participant div already exists
          let participantDiv = refs.remoteVideosRef.current.querySelector(
            `[data-participant-id="${participant.identity}"]`,
          ) as HTMLDivElement;

          if (!participantDiv) {
            // Create new participant div, styled to fill its container
            participantDiv = document.createElement("div");
            participantDiv.className =
              "h-full w-full bg-black rounded-xl border border-border overflow-hidden relative";
            participantDiv.dataset.participantId = participant.identity;

            // Add participant name badge
            const badge = document.createElement("div");
            badge.className =
              "absolute bottom-4 left-4 bg-black/70 text-white border-border backdrop-blur-sm text-xs px-2 py-1 rounded z-10";
            badge.textContent = participant.identity || 'Unknown';
            participantDiv.appendChild(badge);

            refs.remoteVideosRef.current.appendChild(participantDiv);
            console.log("✅ Created participant div for:", participant.identity);
          }

          // Add the media element (video or audio)
          if (track.kind === Track.Kind.Video) {
            // Remove any existing video element and add the new one
            const existingVideo = participantDiv.querySelector("video");
            if (existingVideo) {
              console.log('🔄 Replacing existing video for:', participant.identity);
              existingVideo.remove();
            }
            
            // Ensure the video element has proper attributes
            if (element instanceof HTMLVideoElement) {
              element.autoplay = true;
              element.playsInline = true;
              element.muted = false; // We want to hear remote participants
            }
            
            participantDiv.insertBefore(element, participantDiv.firstChild);
            console.log('✅ Attached remote video for:', participant.identity);
            
            // Force play if it's not playing
            setTimeout(() => {
              if (element instanceof HTMLVideoElement && element.paused) {
                element.play().catch(e => console.log('Video autoplay prevented:', e));
              }
            }, 100);
          } else if (track.kind === Track.Kind.Audio) {
            // For audio tracks, just attach them (they won't be visible)
            if (element instanceof HTMLAudioElement) {
              element.autoplay = true;
              element.muted = false;
            }
            console.log('✅ Attached remote audio for:', participant.identity);
          }
        } else {
          console.warn('⚠️ remoteVideosRef.current is null, cannot attach track');
        }
      } catch (error) {
        console.error('❌ Error attaching remote track:', error);
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
    if (refs.remoteVideosRef.current) {
      const participantDiv = refs.remoteVideosRef.current.querySelector(
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

      if (refs.localVideoRef.current) {
        // Always refresh the video element to ensure latest track is shown
        refs.localVideoRef.current.innerHTML = "";
        refs.localVideoRef.current.appendChild(videoEl);
        console.log('Local video attached/refreshed successfully');
      }
    }
  };

  const handleDisconnect = (reason?: any) => {
    console.log('🔌 Room disconnected with reason:', reason);
    
    // Handle specific disconnect reasons with enhanced logging
    if (reason === 2) {
      console.log('🔗 DataChannel error detected (reason 2) - this is typically a WebRTC connectivity issue');
      console.log('💡 This often happens when participants join and there are connection conflicts');
      console.log('🔄 Clearing connection attempt flag to allow fresh connection');
    } else if (reason === 'USER_INITIATED') {
      console.log('🚪 User initiated disconnect');
    } else if (reason === 'SERVER_SHUTDOWN') {
      console.log('🏢 Server shutdown');
    } else {
      console.log('❓ Other disconnect reason:', reason);
    }
    
    // Always reset connection states to prevent stuck states
    setIsConnected(false);
    setIsConnecting(false);
    refs.connectionAttemptRef.current = false; // Critical: clear the connection attempt flag
    
    // For DataChannel errors or other non-user-initiated disconnects, maintain participant state
    // but still clean up connection flags to allow reconnection
    if (reason === 2) {
      console.log('🔗 DataChannel error - clearing connection flags but maintaining some state');
      // Don't clear participants immediately as this might be a temporary issue
      return;
    }
    
    // For explicit disconnections, clear all state
    if (reason === 'USER_INITIATED' || reason === 'SERVER_SHUTDOWN') {
      console.log('🧹 Clearing all state for explicit disconnect');
      setLiveParticipantCount(0);
      if (refs.remoteVideosRef.current) {
        refs.remoteVideosRef.current.innerHTML = "";
      }
      if (refs.localVideoRef.current) {
        refs.localVideoRef.current.innerHTML = "";
      }
    } else {
      // For other types of disconnections, maintain state for potential reconnection
      console.log('🔄 Maintaining participant state for potential reconnection');
    }
  };

  return {
    handleParticipantConnected,
    handleParticipantDisconnected,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleLocalTrackPublished,
    handleDisconnect,
  };
};
