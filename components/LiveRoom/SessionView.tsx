import React from "react";

interface SessionViewProps {
  sessionId: string;
  userId: string;
  remoteVideosRef: React.RefObject<HTMLDivElement | null>;
  onDisconnect: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  sessionId,
  userId,
  remoteVideosRef,
  onDisconnect,
}) => {
  const copyInviteLink = () => {
    const link = `${window.location.origin}?sessionId=${sessionId}&userId=guest`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-light text-black tracking-wide">
              Live Session
            </h1>
            <span className="text-sm text-gray-600 font-mono">{sessionId}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-600">{userId}</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="text-sm text-black font-light">Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 bg-black p-8">
          <div className="h-full flex items-center justify-center">
            {/* Local Video - Main View */}
            <div className="relative">
              <div
                id="local-video"
                className="w-[600px] h-[400px] bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden"
              >
                <span className="text-gray-400 font-light tracking-wide">
                  Your Video Feed
                </span>
              </div>
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 text-sm font-light tracking-wide">
                YOU
              </div>
            </div>
          </div>

          {/* Remote Participants Grid */}
          <div className="mt-8">
            <h3 className="text-xl font-light text-white mb-6 tracking-wide">
              Participants
            </h3>
            <div
              id="remote-videos"
              ref={remoteVideosRef}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {/* Remote videos will be added here */}
            </div>
            {remoteVideosRef.current?.childElementCount === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 font-light text-lg">
                  No other participants
                </p>
                <p className="text-gray-500 mt-2 font-light">
                  Share the session link to invite others
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-8">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-light text-black mb-6 tracking-wide uppercase">
                Session Details
              </h3>
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Session ID
                  </span>
                  <span className="text-black font-mono text-sm">
                    {sessionId}
                  </span>
                </div>
                <div className="pb-4 border-b border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                    User ID
                  </span>
                  <span className="text-black">{userId}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-light text-black mb-6 tracking-wide uppercase">
                Invite Others
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Invite Link
                  </label>
                  <input
                    type="text"
                    value={`${window.location.origin}?sessionId=${sessionId}&userId=guest`}
                    readOnly
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 text-black text-xs font-mono focus:outline-none focus:border-black"
                  />
                </div>
                <button
                  onClick={copyInviteLink}
                  className="w-full bg-black hover:bg-gray-800 text-white py-3 font-light tracking-wide uppercase text-xs transition-colors duration-200"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-white border-t border-gray-200 px-8 py-6">
        <div className="flex items-center justify-center space-x-6">
          <button className="p-4 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group">
            <svg
              className="w-5 h-5 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button className="p-4 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group">
            <svg
              className="w-5 h-5 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>

          <button
            onClick={onDisconnect}
            className="p-4 bg-black hover:bg-gray-800 transition-colors duration-200 group"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414L8.586 11l-3.293 3.293a1 1 0 001.414 1.414L10 12.414l3.293 3.293a1 1 0 001.414-1.414L11.414 11l3.293-3.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
