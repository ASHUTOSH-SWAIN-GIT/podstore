"use client";

import React, { useEffect, useState } from "react";
import {
  Room,
  RemoteParticipant,
  TrackPublication,
  RemoteTrack,
} from "livekit-client";

const LiveRoom: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!room || !isConnected) return;

    // Attach local video
    room.localParticipant.getTrackPublications().forEach((pub) => {
      if (pub.track && pub.kind === "video") {
        const el = pub.track.attach() as HTMLVideoElement;
        document.getElementById("local-video")?.appendChild(el);
      }
    });

    // Subscribe to remote participants
    const subscribe = (part: RemoteParticipant) => {
      part.getTrackPublications().forEach((pub) => {
        if (pub.track && pub.kind === "video" && pub.track instanceof RemoteTrack) {
          attach(pub.track, part.sid);
        }
      });

      part.on("trackPublished", (pub) => {
        if (pub.track && pub.kind === "video" && pub.track instanceof RemoteTrack) {
          attach(pub.track, part.sid);
        }
      });

      part.on("trackUnpublished", () => {
        detach(part.sid);
      });
    };

    const attach = (track: RemoteTrack, sid: string) => {
      const el = track.attach() as HTMLVideoElement;
      el.id = `remote-${sid}`;
      document.getElementById("remote-videos")?.appendChild(el);
    };

    const detach = (sid: string) => {
      const el = document.getElementById(`remote-${sid}`);
      el?.remove();
    };

    room.remoteParticipants.forEach(subscribe);
    room.on("participantConnected", subscribe);
    room.on("participantDisconnected", (participant) => detach(participant.sid));

    return () => {
      room.disconnect();
    };
  }, [room, isConnected]);

  const joinRoom = async () => {
    if (!userId.trim() || !sessionId.trim()) {
      return alert("Please enter both User ID and Session ID");
    }

    let existingSessionId = sessionId;

    try {
      // Step 1: Check if session exists
      const existing = await fetch("/api/sessions");
      if (!existing.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const sessions = await existing.json();
      
      // Ensure sessions is an array before using find
      const sessionExists = Array.isArray(sessions) && sessions.find((s: any) => s.id === sessionId);

      // Step 2: Create session if not exists
      if (!sessionExists) {
        if (!title.trim()) {
          return alert("Title is required for creating a new session");
        }

        const createRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: userId, title, id: sessionId }),
        });

        if (!createRes.ok) throw new Error("Failed to create session");
        const newSession = await createRes.json();
        existingSessionId = newSession.id;
      }

      // Step 3: Get token
      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId: existingSessionId }),
      });

      if (!tokenRes.ok) throw new Error("Token fetch failed");
      const token = await tokenRes.text();

      // Step 4: Connect to room
      const liveRoom = new Room();
      await liveRoom.connect("wss://podstore-6jysneci.livekit.cloud", token);
      setRoom(liveRoom);
      setIsConnected(true);

      await liveRoom.localParticipant.setMicrophoneEnabled(true);
      await liveRoom.localParticipant.setCameraEnabled(true);

      // Step 5: Add participant to DB
      await fetch(`/api/sessions/${existingSessionId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      console.error("Error joining session:", err);
      alert("Failed to join session. Check console.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {!isConnected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Session Title (required if creating)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={joinRoom}>Join or Create Session</button>
        </div>
      ) : (
        <div>
          <h3>
            Connected as <strong>{userId}</strong> in room <strong>{sessionId}</strong>
          </h3>
          <div
            id="local-video"
            style={{ width: 320, height: 240, backgroundColor: "#000", marginBottom: 20 }}
          />
          <div
            id="remote-videos"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          />
        </div>
      )}
    </div>
  );
};

export default LiveRoom;
