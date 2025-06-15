import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  LocalTrackPublication,
  LocalParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Participant,
} from "livekit-client";

export const useLiveKit = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const remoteVideosRef = useRef<HTMLDivElement | null>(null);

  // Initialize room
  useEffect(() => {
    const livekit = require("livekit-client");
    const newRoom = new livekit.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    setRoom(newRoom);

    return () => {
      newRoom.disconnect();
    };
  }, []);

  // Event handlers
  const handleTrackSubscribed = useCallback(
    (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const element = track.attach();
        if (remoteVideosRef.current) {
          remoteVideosRef.current.appendChild(element);
        }
      }
    },
    [],
  );

  const handleTrackUnsubscribed = useCallback(
    (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      track.detach();
    },
    [],
  );

  const handleLocalTrackUnpublished = useCallback(
    (publication: LocalTrackPublication, participant: LocalParticipant) => {
      if (publication.track) {
        publication.track.detach();
      }
    },
    [],
  );

  const handleDisconnect = useCallback(() => {
    console.log("disconnected from room");
    setIsConnected(false);
    if (remoteVideosRef.current) {
      remoteVideosRef.current.innerHTML = "";
    }
    const localContainer = document.getElementById("local-video");
    if (localContainer) {
      localContainer.innerHTML = "";
    }
  }, []);

  const handleActiveSpeakerChange = useCallback((speakers: Participant[]) => {
    // optional: highlight speaking participants
  }, []);

  const handleLocalTrackPublished = useCallback(
    (publication: LocalTrackPublication, participant: LocalParticipant) => {
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
    },
    [],
  );

  const connectToRoom = useCallback(
    async (
      url: string,
      token: string,
      selectedAudio: string,
      selectedVideo: string,
    ) => {
      if (!room || !token || !url) {
        throw new Error("Room, token, or URL not available");
      }

      console.log("Connecting to:", url, "with token:", token);

      room.prepareConnection(url, token);

      room
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange)
        .on(RoomEvent.Disconnected, handleDisconnect)
        .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
        .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

      await room.connect(url, token);
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

      // Fallback video attachment with timeout
      setTimeout(() => {
        console.log("Attempting to attach local video...");
        console.log("Local participant:", p);
        console.log("Video track publications:", p.videoTrackPublications);

        if (p.videoTrackPublications && p.videoTrackPublications.size > 0) {
          const videoPublication = Array.from(
            p.videoTrackPublications.values(),
          )[0] as LocalTrackPublication | undefined;
          console.log("Video publication:", videoPublication);

          const videoTrack = videoPublication?.track;
          console.log("Video track:", videoTrack);

          if (videoTrack) {
            const videoEl = videoTrack.attach();
            console.log("Created video element:", videoEl);

            const container = document.getElementById("local-video");
            console.log("Container found:", container);

            if (container) {
              container.innerHTML = "";
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
          console.error(
            "No video track publications found. Retrying in 2 seconds...",
          );
          setTimeout(() => {
            if (p.videoTrackPublications && p.videoTrackPublications.size > 0) {
              const videoPublication = Array.from(
                p.videoTrackPublications.values(),
              )[0] as LocalTrackPublication | undefined;
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
    },
    [
      room,
      handleTrackSubscribed,
      handleTrackUnsubscribed,
      handleActiveSpeakerChange,
      handleDisconnect,
      handleLocalTrackUnpublished,
      handleLocalTrackPublished,
    ],
  );

  const disconnectFromRoom = useCallback(() => {
    if (room) {
      room.disconnect();
    }
  }, [room]);

  return {
    room,
    isConnected,
    remoteVideosRef,
    connectToRoom,
    disconnectFromRoom,
  };
};
