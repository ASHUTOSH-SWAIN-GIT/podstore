export const livekitConfig = {
  serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || "",

  roomOptions: {
    adaptiveStream: true,
    dynacast: true,
    autoSubscribe: true, // Automatically subscribe to remote tracks
    videoCaptureDefaults: {
      resolution: { width: 1280, height: 720 },
      facingMode: "user" as const, // Front-facing camera for video calls
    },
  },

  videoOptions: {
    resolution: { width: 1280, height: 720 },
    facingMode: "user" as const,
    frameRate: 30,
  },

  audioOptions: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
