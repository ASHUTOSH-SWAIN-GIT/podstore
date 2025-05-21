"use client";

import React, { useEffect, useState } from "react";
import {
  Room,
  RemoteParticipant,
  TrackPublication,
  RemoteTrack,
} from "livekit-client";

export default function LiveRoom() {
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!room || !isConnected) return;

    room.localParticipant.getTrackPublications().forEach(
      (pub: TrackPublication) => {
        if (pub.track && pub.kind === "video") {
          const el = pub.track.attach() as HTMLVideoElement;
          document.getElementById("local-video")?.appendChild(el);
        }
      }
    );

    function subscribe(part: RemoteParticipant) {
      part.getTrackPublications().forEach((pub) => {
        if (
          pub.track &&
          pub.kind === "video" &&
          pub.track instanceof RemoteTrack
        ) {
          attach(pub.track, part.sid);
        }
      });

      part.on("trackPublished", (pub: TrackPublication) => {
        if (
          pub.track &&
          pub.kind === "video" &&
          pub.track instanceof RemoteTrack
        ) {
          attach(pub.track, part.sid);
        }
      });

      part.on("trackUnpublished", (pub: TrackPublication) => {
        if (
          pub.track &&
          pub.kind === "video" &&
          pub.track instanceof RemoteTrack
        ) {
          detach(part.sid);
        }
      });
    }

    function attach(track: RemoteTrack, sid: string) {
      const el = track.attach() as HTMLVideoElement;
      el.id = `remote-${sid}`;
      document.getElementById("remote-videos")?.appendChild(el);
    }

    function detach(sid: string) {
      const el = document.getElementById(`remote-${sid}`);
      el?.parentNode?.removeChild(el);
    }

    room.remoteParticipants.forEach(subscribe);
    room.on("participantConnected", subscribe);
    room.on("participantDisconnected", (participant) => detach(participant.sid));

    return () => {
      room.disconnect();
    };
  }, [room, isConnected]);

  const joinRoom = async () => {
    if (!userId.trim()) return alert("Please enter User ID");
    if (isCreatingSession && !title.trim()) return alert("Please enter a title");
    if (!isCreatingSession && !sessionId.trim()) return alert("Please enter Session ID");

    let finalSessionId = sessionId;

    try {
      if (isCreatingSession) {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: userId, title }),
        });

        if (!res.ok) throw new Error("Failed to create session");
        const session = await res.json();
        finalSessionId = session.id;
        setSessionId(session.id);
      }

      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId: finalSessionId }),
      });

      if (!tokenRes.ok) throw new Error("Token fetch failed");
      const token = await tokenRes.text();

      const liveRoom = new Room();
      await liveRoom.connect("wss://podstore-6jysneci.livekit.cloud", token);
      setRoom(liveRoom);
      setIsConnected(true);

      await liveRoom.localParticipant.setMicrophoneEnabled(true);
      await liveRoom.localParticipant.setCameraEnabled(true);

      await fetch(`/api/session/${finalSessionId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: isCreatingSession ? "HOST" : "GUEST",
        }),
      });
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {!isConnected ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300 }}
        >
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          {isCreatingSession ? (
            <>
              <input
                type="text"
                placeholder="Session Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </>
          ) : (
            <input
              type="text"
              placeholder="Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
          )}
          <label>
            <input
              type="checkbox"
              checked={isCreatingSession}
              onChange={(e) => setIsCreatingSession(e.target.checked)}
            />
            Create new session
          </label>
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <h3>
            Connected as <strong>{userId}</strong> in room{" "}
            <strong>{sessionId}</strong>
          </h3>
          <div
            id="local-video"
            style={{
              width: 320,
              height: 240,
              backgroundColor: "#000",
              marginBottom: 20,
            }}
          />
          <div
            id="remote-videos"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          />
        </div>
      )}
    </div>
  );
}
