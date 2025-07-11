import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

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
  onJoinSession,
}) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Auto-populate userId when user is authenticated
  React.useEffect(() => {
    if (user && !userId) {
      onUserIdChange(user.id);
    }
  }, [user, userId, onUserIdChange]);

  const handleSignInClick = () => {
    // Build auth URL with current session parameters
    const authUrl = new URL("/auth", window.location.origin);
    authUrl.searchParams.set(
      "returnTo",
      window.location.pathname + window.location.search,
    );
    if (sessionId) {
      authUrl.searchParams.set("sessionId", sessionId);
    }
    if (userId) {
      authUrl.searchParams.set("userId", userId);
    }

    router.push(authUrl.toString());
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl border border-gray-200">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-light text-black tracking-wide">
              Join Session
            </h1>
            {user && (
              <button
                onClick={signOut}
                className="text-xs text-gray-600 hover:text-black transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>

          {hasUrlParams && (
            <div className="mb-6 p-4 bg-black border border-gray-300">
              <p className="text-white text-sm text-center font-light">
                {isAutoJoining
                  ? "⚡ Connecting..."
                  : "📋 Auto-filled from invite"}
              </p>
            </div>
          )}

          {/* Authentication Status */}
          {!user && !authLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200">
              <p className="text-blue-800 text-sm text-center mb-3">
                For the best experience, sign in to your account
              </p>
              <button
                onClick={handleSignInClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-sm font-medium transition-colors duration-200"
              >
                Sign In or Create Account
              </button>
            </div>
          )}

          {user && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200">
              <p className="text-green-800 text-sm text-center">
                ✓ Signed in as {user.email}
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
                placeholder={
                  user ? "Auto-filled from account" : "Enter your ID"
                }
                value={userId}
                onChange={(e) => onUserIdChange(e.target.value)}
                disabled={!!user}
                className="w-full px-4 py-3 bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors duration-200 disabled:bg-gray-50 disabled:text-gray-600"
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

            {/* Guest Access Note */}
            {!user && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Continuing as guest? You can still join the session, but
                  features may be limited.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
