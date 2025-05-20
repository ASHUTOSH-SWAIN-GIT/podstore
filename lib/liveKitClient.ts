// lib/livekitClient.ts
import { Room } from 'livekit-client';

export async function joinLiveKitRoom(token: string, livekitUrl: string) {
  const room = new Room();

  await room.connect(livekitUrl, token);

  // Optionally publish local tracks (mic/camera)
  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);

  room.on('participantConnected', participant => {
    console.log('Remote participant connected:', participant.identity);
  });

  return room;
}
