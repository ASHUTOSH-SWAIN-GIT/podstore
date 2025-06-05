import React from 'react';
import Link from 'next/link';

interface JoinFormProps {
  userId: string;
  sessionId: string;
  title: string;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudio: string;
  selectedVideo: string;
  isAutoJoining: boolean;
  hasUrlParams: boolean;
  onUserIdChange: (value: string) => void;
  onSessionIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onAudioDeviceChange: (value: string) => void;
  onVideoDeviceChange: (value: string) => void;
  onJoinSession: () => Promise<void>;
}

export const JoinForm: React.FC<JoinFormProps> = ({
  userId,
  sessionId,
  title,
  audioDevices,
  videoDevices,
  selectedAudio,
  selectedVideo,
  isAutoJoining,
  hasUrlParams,
  onUserIdChange,
  onSessionIdChange,
  onTitleChange,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onJoinSession
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl border border-gray-200">
        <div className="p-8">
          <h1 className="text-3xl font-light text-center mb-8 text-black tracking-wide">
            Join Session
          </h1>

          {hasUrlParams && (
            <div className="mb-6 p-4 bg-black border border-gray-300">
              <p className="text-white text-sm text-center font-light">
                {isAutoJoining ? "⚡ Connecting..." : "📋 Auto-filled from invite"}
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                User Identifier
              </label>
              <input
                type="text"
                placeholder="Enter your ID"
                value={userId}
                onChange={(e) => onUserIdChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                Session Identifier
              </label>
              <input
                type="text"
                placeholder="Enter session ID"
                value={sessionId}
                onChange={(e) => onSessionIdChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                Session Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors duration-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                  Audio Device
                </label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:outline-none focus:border-black transition-colors duration-200"
                  value={selectedAudio}
                  onChange={(e) => onAudioDeviceChange(e.target.value)}
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Audio Device ${d.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                  Video Device
                </label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:outline-none focus:border-black transition-colors duration-200"
                  value={selectedVideo}
                  onChange={(e) => onVideoDeviceChange(e.target.value)}
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Video Device ${d.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onJoinSession}
                disabled={isAutoJoining || !userId.trim() || !sessionId.trim()}
                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white font-light py-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 tracking-wide uppercase text-sm"
              >
                {isAutoJoining ? "Connecting..." : "Join Session"}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-black hover:underline font-medium">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 