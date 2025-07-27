import { useCallback } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
} from "livekit-client";
import { livekitConfig } from "@/lib/livekit-config";
import { SessionRefs } from "./types";

export const createConnectionHandlers = (
  room: Room | null,
  refs: SessionRefs,
  isConnecting: boolean,
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>,
  setLiveParticipantCount: React.Dispatch<React.SetStateAction<number>>,
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>,
  setIsVideoOff: React.Dispatch<React.SetStateAction<boolean>>,
  eventHandlers: any,
  ensureLocalVideoAttached: () => void
) => {
  const connectToRoom = useCallback(async (sessionId: string, userId: string) => {
    if (!room) {
      console.log('❌ No room available for connection');
      return;
    }

    // Enhanced connection guard to prevent multiple attempts
    if (refs.connectionAttemptRef.current) {
      console.log('🚫 Connection attempt already in progress');
      return;
    }

    if (isConnecting) {
      console.log('🚫 Already in connecting state');
      return;
    }

    if (room.state === ConnectionState.Connected) {
      console.log('✅ Already connected to room - skipping reconnection');
      // Ensure local video is attached if somehow missing
      setTimeout(() => {
        ensureLocalVideoAttached();
      }, 100);
      return;
    }

    if (room.state === ConnectionState.Connecting) {
      console.log('🔄 Room is currently connecting - waiting');
      return;
    }

    refs.connectionAttemptRef.current = true;
    setIsConnecting(true);

    try {
      console.log('🚀 Connecting to room:', sessionId, 'as user:', userId);
      
      // Get token from your API
      const tokenResponse = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }

      const { token } = await tokenResponse.json();

      // Only set up event listeners ONCE to prevent conflicts
      if (room.listenerCount(RoomEvent.ParticipantConnected) === 0) {
        console.log('🔗 Setting up room event listeners (first time only)');
        room
          .on(RoomEvent.ParticipantConnected, eventHandlers.handleParticipantConnected)
          .on(RoomEvent.ParticipantDisconnected, eventHandlers.handleParticipantDisconnected)
          .on(RoomEvent.TrackSubscribed, eventHandlers.handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, eventHandlers.handleTrackUnsubscribed)
          .on(RoomEvent.LocalTrackPublished, eventHandlers.handleLocalTrackPublished)
          .on(RoomEvent.Disconnected, eventHandlers.handleDisconnect)
          .on(RoomEvent.ConnectionStateChanged, (state) => {
            console.log('🔗 Connection state changed:', state);
            if (state === ConnectionState.Connected) {
              console.log('✅ Room connected successfully');
              setIsConnected(true);
              setIsConnecting(false);
              refs.connectionAttemptRef.current = false;
            } else if (state === ConnectionState.Disconnected) {
              console.log('❌ Room disconnected');
              setIsConnected(false);
              setIsConnecting(false);
              refs.connectionAttemptRef.current = false;
            } else if (state === ConnectionState.Reconnecting) {
              console.log('🔄 Room reconnecting...');
              setIsConnecting(true);
            }
          });
      } else {
        console.log('♻️ Event listeners already set up - skipping to prevent duplicates');
      }

      // Connect to room
      await room.connect(livekitConfig.serverUrl, token);
      console.log('✅ Successfully connected to room');
      setIsConnected(true);
      setIsConnecting(false);

      // Count existing participants after connection
      const existingParticipants = Array.from(
        room.remoteParticipants.values(),
      );
      setLiveParticipantCount(existingParticipants.length);
      console.log(`👥 Found ${existingParticipants.length} existing participants`);

      // Process existing participants and their tracks
      if (existingParticipants.length > 0) {
        console.log('🔍 Processing existing participants and their tracks...');
        
        for (const participant of existingParticipants) {
          console.log(`📹 Processing participant: ${participant.identity}`);
          
          // Process existing video tracks
          participant.videoTrackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              console.log(`🎥 Found existing video track for ${participant.identity}, attaching...`);
              eventHandlers.handleTrackSubscribed(
                publication.track,
                publication,
                participant
              );
            } else if (publication.track) {
              console.log(`🎥 Found unsubscribed video track for ${participant.identity}, will try to subscribe...`);
              // Track exists but not subscribed yet, let's wait a bit and check again
              setTimeout(() => {
                if (publication.isSubscribed && publication.track) {
                  eventHandlers.handleTrackSubscribed(
                    publication.track,
                    publication,
                    participant
                  );
                }
              }, 1000);
            }
          });

          // Process existing audio tracks
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              console.log(`🎤 Found existing audio track for ${participant.identity}, attaching...`);
              eventHandlers.handleTrackSubscribed(
                publication.track,
                publication,
                participant
              );
            }
          });
        }
        
        // Also set up a broader check after a delay to catch any tracks that weren't ready immediately
        setTimeout(() => {
          console.log('🔄 Double-checking for any missed existing tracks...');
          for (const participant of room.remoteParticipants.values()) {
            participant.videoTrackPublications.forEach((publication) => {
              if (publication.isSubscribed && publication.track) {
                // Check if we already have a video element for this participant
                const existingVideo = refs.remoteVideosRef.current?.querySelector(
                  `[data-participant-id="${participant.identity}"] video`
                );
                if (!existingVideo) {
                  console.log(`🎥 Found missed video track for ${participant.identity}, attaching now...`);
                  eventHandlers.handleTrackSubscribed(
                    publication.track,
                    publication,
                    participant
                  );
                }
              }
            });
          }
        }, 2000);
      }

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
        console.log('🎥 Ensuring local video is attached after connection');
        ensureLocalVideoAttached();
      }, 500); // Reduced delay for faster attachment
      
    } catch (error) {
      console.error("❌ Failed to connect to room:", error);
      setIsConnecting(false);
      // Add more robust error handling, e.g., set an error state
    } finally {
      refs.connectionAttemptRef.current = false;
    }
  }, [room, isConnecting, eventHandlers, ensureLocalVideoAttached]); // Add dependencies to useCallback

  return {
    connectToRoom,
  };
};
