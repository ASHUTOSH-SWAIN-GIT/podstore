export const livekitConfig = {
  serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
  
  roomOptions: {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: { width: 1280, height: 720 }, // Using explicit resolution instead of VideoPresets
    },
  },

  audioOptions: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}; 