"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Settings, Check, X, ChevronDown } from "lucide-react";
import { Room } from "livekit-client";

interface Session {
  id: string;
  title: string;
  hostId: string;
  status: string;
  createdAt: string;
  joinToken: string;
  host: {
    name: string;
    email: string;
  };
}

export default function SetupPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const token = params.token as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  
  const [cameraPermission, setCameraPermission] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('prompt');
  const [microphonePermission, setMicrophonePermission] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('prompt');
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isUsingHeadphones, setIsUsingHeadphones] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!token) {
          setError("Session token is missing.");
          setLoading(false);
          return;
      }
      try {
        let response = await fetch(`/api/sessions/by-token/${token}`);
        if (!response.ok) {
          response = await fetch(`/api/sessions/${token}`);
        }
        if (!response.ok) {
          throw new Error("Invalid or expired session link");
        }
        const sessionData = await response.json();
        setSession(sessionData);
      } catch (err) {
        setError("Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [token]);

  const requestPermissionsAndGetDevices = async () => {
    setIsRequestingPermissions(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
      });

      setCameraPermission('granted');
      setMicrophonePermission('granted');
      setIsCameraOn(true);
      setMediaStream(stream);

      // Now that we have permission, enumerate the devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter(d => d.kind === 'audioinput');
      const video = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audio);
      setVideoDevices(video);

      if (audio.length > 0 && !selectedAudio) setSelectedAudio(audio[0].deviceId);
      if (video.length > 0 && !selectedVideo) setSelectedVideo(video[0].deviceId);
      
    } catch (e) {
        console.error("Permission denied or no devices found:", e);
        if(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
            setCameraPermission('denied');
            setMicrophonePermission('denied');
        }
    } finally {
        setIsRequestingPermissions(false);
    }
  };

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, [mediaStream]);

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const toggleMediaTrack = (type: 'audio' | 'video') => {
      if (!mediaStream) return;
      const tracks = type === 'video' ? mediaStream.getVideoTracks() : mediaStream.getAudioTracks();
      tracks.forEach(track => {
          track.enabled = !track.enabled;
          if (type === 'video') setIsCameraOn(track.enabled);
          if (type === 'audio') setIsMicOn(track.enabled);
      });
  };

  const changeDevice = async (type: 'audio' | 'video', deviceId: string) => {
    if (type === 'audio') setSelectedAudio(deviceId);
    if (type === 'video') setSelectedVideo(deviceId);

    mediaStream?.getTracks().forEach(track => track.stop());

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: type === 'video' ? deviceId : selectedVideo } },
            audio: { deviceId: { exact: type === 'audio' ? deviceId : selectedAudio } }
        });
        setMediaStream(newStream);
        // Preserve on/off state
        newStream.getVideoTracks().forEach(t => t.enabled = isCameraOn);
        newStream.getAudioTracks().forEach(t => t.enabled = isMicOn);

    } catch (err) {
        console.error(`Failed to switch ${type} device:`, err);
    }
  };

  const handleJoinSession = async () => {
    if (!session || !user) return;
    
    // Add user as participant to the session
    try {
      const response = await fetch(`/api/sessions/${session.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          role: session.hostId === user.id ? 'HOST' : 'GUEST' 
        }),
      });

      if (!response.ok) {
        console.warn('Failed to add participant to session, but proceeding to join');
      }
    } catch (error) {
      console.warn('Error adding participant:', error);
    }

    // Stop the preview stream
    mediaStream?.getTracks().forEach(track => track.stop());
    
    // Build session URL with device preferences
    const params = new URLSearchParams({
        audioDevice: selectedAudio,
        videoDevice: selectedVideo,
        cameraEnabled: String(isCameraOn),
        micEnabled: String(isMicOn),
    });
    
    router.push(`/session/${session.id}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
        <div className="bg-[#1C1C1C] border border-gray-700 rounded-lg p-8 text-center text-white max-w-sm">
          <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
          <p className="text-gray-400">{error || "The session link may be invalid or expired."}</p>
        </div>
      </div>
    );
  }
  
  const hasPermissions = cameraPermission === 'granted' && microphonePermission === 'granted';

  return (
    <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Column: Setup Controls */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <p className="text-gray-400 text-sm">You're about to join {session.host.name}'s Studio</p>
            <h1 className="text-4xl font-bold mt-2 mb-8">Let's check your cam and mic</h1>
            
            <div className="w-full max-w-sm space-y-4">
              <div className="bg-[#2C2C2C] rounded-md p-3 flex items-center justify-between">
                <span className="font-medium">{user?.user_metadata?.name || user?.email}</span>
                <span className="text-xs bg-[#444444] text-gray-300 px-2 py-1 rounded">
                  {session.hostId === user?.id ? 'Host' : 'Guest'}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setIsUsingHeadphones(false)}
                  className={`w-full py-3 rounded-md text-sm font-medium transition-colors ${
                    !isUsingHeadphones ? 'bg-[#4A4A4A] text-white' : 'bg-[#2C2C2C] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  I am not using headphones
                </button>
                <button
                  onClick={() => setIsUsingHeadphones(true)}
                  className={`w-full py-3 rounded-md text-sm font-medium transition-colors ${
                    isUsingHeadphones ? 'bg-[#8A63D2] text-white' : 'bg-[#2C2C2C] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  I am using headphones
                </button>
              </div>

              {hasPermissions ? (
                  <Button
                    onClick={handleJoinSession}
                    className="w-full py-6 text-base font-bold bg-[#8A63D2] hover:bg-[#7955b8] transition-colors"
                  >
                    Join studio
                  </Button>
              ) : (
                  <Button
                    onClick={requestPermissionsAndGetDevices}
                    disabled={isRequestingPermissions || cameraPermission === 'denied'}
                    className="w-full py-6 text-base font-bold bg-[#8A63D2] hover:bg-[#7955b8] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isRequestingPermissions ? 'Requesting...' : (cameraPermission === 'denied' ? 'Permissions Blocked' : 'Allow access')}
                  </Button>
              )}


              <p className="text-xs text-gray-500 text-center">
                You are joining as {session.hostId === user?.id ? 'the host' : 'a guest'}.
              </p>
            </div>
          </div>

          {/* Right Column: Video Preview & Device Selection */}
          <div className="w-full max-w-md mx-auto lg:max-w-none">
            <div className="relative aspect-video bg-[#2C2C2C] rounded-lg flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraOn && mediaStream ? 'opacity-100' : 'opacity-0'}`}
              />
              {(!isCameraOn || !mediaStream) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <div className="flex space-x-4">
                    <div className={`p-2 rounded-full ${cameraPermission === 'denied' ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                      <VideoOff className={`${cameraPermission === 'denied' ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                    </div>
                    <div className={`p-2 rounded-full ${microphonePermission === 'denied' ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                      <MicOff className={`${microphonePermission === 'denied' ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                    </div>
                  </div>
                  <p className="mt-4 text-sm">
                    {cameraPermission === 'denied' ? 'Camera access is denied' : 'Camera is off'}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2 mt-4">
                <DeviceSelector 
                    icon={<Video size={16} />}
                    label="Camera"
                    selectedDeviceId={selectedVideo}
                    devices={videoDevices}
                    onChange={(id) => changeDevice('video', id)}
                    permission={cameraPermission}
                />
                <DeviceSelector 
                    icon={<Mic size={16} />}
                    label="Microphone"
                    selectedDeviceId={selectedAudio}
                    devices={audioDevices}
                    onChange={(id) => changeDevice('audio', id)}
                    permission={microphonePermission}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Dropdown Component for Device Selection
const DeviceSelector = ({ icon, label, selectedDeviceId, devices, onChange, permission }: {
    icon: React.ReactNode;
    label: string;
    selectedDeviceId: string;
    devices: MediaDeviceInfo[];
    onChange: (id: string) => void;
    permission: 'granted' | 'denied' | 'prompt' | 'checking';
}) => {
    const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                disabled={permission !== 'granted'}
                className="w-full bg-[#2C2C2C] rounded-md p-3 flex items-center justify-between text-left disabled:opacity-50"
            >
                <div className="flex items-center space-x-3">
                    <div className="text-gray-400">{icon}</div>
                    <span className="text-sm font-medium truncate">
                        {permission !== 'granted' ? `Allow ${label} Access` : (selectedDevice?.label || `No ${label} Found`)}
                    </span>
                </div>
                {permission === 'granted' && <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
            {isOpen && permission === 'granted' && devices.length > 0 && (
                <div className="absolute bottom-full mb-2 w-full bg-[#3a3a3a] border border-gray-600 rounded-md z-10 p-1">
                    {devices.map(device => (
                        <button
                            key={device.deviceId}
                            onClick={() => handleSelect(device.deviceId)}
                            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#4A4A4A] flex items-center justify-between"
                        >
                            <span className="truncate">{device.label}</span>
                            {device.deviceId === selectedDeviceId && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
