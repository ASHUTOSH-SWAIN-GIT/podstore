"use client";

import { useState, useEffect, useCallback } from "react";
import { Suspense } from "react";
import { livekitConfig } from "@/lib/livekit-config";
import { apiClient } from "@/lib/api-client";
import { useUrlParams, useDevices, useLiveKit, useAutoJoin } from "@/hooks";
import { JoinForm, SessionView } from "@/components";

function LiveRoomContent() {
  // Form state
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");

  // URL parameters
  const { urlSessionId, urlUserId, hasUrlParams } = useUrlParams();

  // Devices
  const {
    audioDevices,
    videoDevices,
    selectedAudio,
    selectedVideo,
    devicesLoaded,
    setSelectedAudio,
    setSelectedVideo
  } = useDevices();

  // LiveKit
  const {
    room,
    isConnected,
    remoteVideosRef,
    connectToRoom,
    disconnectFromRoom
  } = useLiveKit();

  // Auto-populate form from URL parameters
  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
    if (urlUserId) {
      setUserId(urlUserId);
    }
  }, [urlSessionId, urlUserId]);

  // Join session handler
  const joinSession = useCallback(async () => {
    if (!userId.trim() || !sessionId.trim()) {
      alert("Please fill in both User ID and Session ID");
      return;
    }

    if (!livekitConfig.serverUrl) {
      alert("LiveKit server URL not configured. Please check your environment variables.");
      return;
    }

    try {
      const token = await apiClient.fetchToken(userId, sessionId);
      await connectToRoom(livekitConfig.serverUrl, token, selectedAudio, selectedVideo);
    } catch (error) {
      console.error("Failed to join session:", error);
      alert("Failed to join session. Please try again.");
    }
  }, [userId, sessionId, selectedAudio, selectedVideo, connectToRoom]);

  // Auto-join functionality
  const { isAutoJoining } = useAutoJoin({
    urlSessionId,
    urlUserId,
    selectedAudio,
    selectedVideo,
    isConnected,
    onAutoJoin: joinSession
  });

  // Show loading state while devices are being initialized
  if (!devicesLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-light tracking-wide">Initializing devices...</p>
        </div>
      </div>
    );
  }

  // Show session view if connected
  if (isConnected && room) {
    return (
      <SessionView
        sessionId={sessionId}
        userId={userId}
        remoteVideosRef={remoteVideosRef}
        onDisconnect={disconnectFromRoom}
      />
    );
  }

  // Show join form
  return (
    <JoinForm
      userId={userId}
      sessionId={sessionId}
      title={title}
      audioDevices={audioDevices}
      videoDevices={videoDevices}
      selectedAudio={selectedAudio}
      selectedVideo={selectedVideo}
      isAutoJoining={isAutoJoining}
      hasUrlParams={hasUrlParams}
      onUserIdChange={setUserId}
      onSessionIdChange={setSessionId}
      onTitleChange={setTitle}
      onAudioDeviceChange={setSelectedAudio}
      onVideoDeviceChange={setSelectedVideo}
      onJoinSession={joinSession}
    />
  );
}

export default function LiveRoom() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-light tracking-wide">Loading...</p>
        </div>
      </div>
    }>
      <LiveRoomContent />
    </Suspense>
  );
}
