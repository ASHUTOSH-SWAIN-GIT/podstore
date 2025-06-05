import { useState, useEffect } from 'react';
import { Room } from 'livekit-client';

export const useDevices = () => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [devicesLoaded, setDevicesLoaded] = useState(false);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const audio = await Room.getLocalDevices("audioinput");
        const video = await Room.getLocalDevices("videoinput");
        
        setAudioDevices(audio);
        setVideoDevices(video);
        setSelectedAudio(audio[0]?.deviceId || "");
        setSelectedVideo(video[0]?.deviceId || "");
        setDevicesLoaded(true);
      } catch (error) {
        console.error("Failed to get devices:", error);
      }
    };
    
    getDevices();
  }, []);

  return {
    audioDevices,
    videoDevices,
    selectedAudio,
    selectedVideo,
    devicesLoaded,
    setSelectedAudio,
    setSelectedVideo
  };
}; 