import { Track } from "livekit-client";
import { livekitConfig } from "@/lib/livekit-config";
import { SessionRefs } from "./types";

export const createUtilityFunctions = (
  refs: SessionRefs,
  room: any
) => {
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

  const ensureLocalVideoAttached = () => {
    if (room && refs.localVideoRef.current && room.localParticipant && !refs.videoAttachingRef.current) {
      console.log('Attempting to attach local video...');
      console.log('Video publications:', room.localParticipant.videoTrackPublications.size);
      
      // Check if video element already exists to prevent flickering
      const existingVideo = refs.localVideoRef.current.querySelector('video');
      if (existingVideo && existingVideo.srcObject) {
        console.log('Video element already attached, skipping reattachment to prevent flickering');
        return;
      }
      
      refs.videoAttachingRef.current = true;
      
      room.localParticipant.videoTrackPublications.forEach((publication: any) => {
        console.log('Found video publication:', publication.trackSid, publication.track?.kind);
        
        if (publication.track && publication.kind === Track.Kind.Video) {
          try {
            const videoEl = publication.track.attach();
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.objectFit = "cover";
            videoEl.style.borderRadius = "12px";

            // Only clear and append if there's no existing video to prevent flickering
            if (!existingVideo && refs.localVideoRef.current) {
              refs.localVideoRef.current.innerHTML = "";
              refs.localVideoRef.current.appendChild(videoEl);
              console.log('Successfully attached local video element');
            }
          } catch (error) {
            console.error('Error attaching local video:', error);
          }
        }
      });
      
      refs.videoAttachingRef.current = false;
      
      // If no video tracks found, try to enable camera again
      if (room.localParticipant.videoTrackPublications.size === 0) {
        console.log('No video tracks found, attempting to enable camera...');
        room.localParticipant.setCameraEnabled(true, livekitConfig.videoOptions)
          .then(() => {
            console.log('Camera enabled successfully');
            // Try again after a short delay
            setTimeout(() => ensureLocalVideoAttached(), 2000);
          })
          .catch((error: any) => {
            console.error('Failed to enable camera:', error);
            refs.videoAttachingRef.current = false;
          });
      }
    }
  };

  return {
    formatDuration,
    copyInviteLink,
    ensureLocalVideoAttached,
  };
};
