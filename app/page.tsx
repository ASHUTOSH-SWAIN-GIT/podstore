// components/JoinRoom.tsx
'use client';

import { useState } from 'react';

export default function JoinRoom() {
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);

    const res = await fetch('/api/token', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user_abc123',     // replace with real value
    sessionId: 'session_xyz', // use real participant ID here
      }),
    });

    const { token } = await res.json();

    const { joinLiveKitRoom } = await import('../lib/liveKitClient');
    const room = await joinLiveKitRoom(token, 'wss://podstore-6jysneci.livekit.cloud');

    console.log('Joined room:', room.name);
    setJoining(false);
  };

  return (
    <button onClick={handleJoin} disabled={joining}>
      {joining ? 'Joining...' : 'Join Room'}
    </button>
  );
}
