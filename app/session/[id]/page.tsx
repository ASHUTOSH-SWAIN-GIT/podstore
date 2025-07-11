"use client";

import React, { RefObject, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionControls } from "@/hooks/useSessionControls";
import { SessionHeader } from "@/components/session/SessionHeader";
import { VideoArea } from "@/components/session/VideoArea";
import { SessionControls } from "@/components/session/SessionControls";
import { SessionSidebar } from "@/components/session/SessionSidebar";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const { user } = useAuth();
  const { session, participants, isLoading, error } = useSessionData(sessionId);
  const {
    isRecording,
    recordingDuration,
    recordingError,
    isMuted,
    isVideoOff,
    isConnected,
    localVideoRef,
    remoteVideosRef,
    liveParticipantCount,
    formatDuration,
    copyInviteLink,
    toggleRecording,
    toggleMute,
    toggleVideo,
    handleEndSession,
    connectToRoom,
    ensureLocalVideoAttached,
  } = useSessionControls();

  // Get device preferences from URL parameters (client-side only)
  const [devicePreferences, setDevicePreferences] = useState<{
    audioDevice?: string | null;
    videoDevice?: string | null;
    cameraEnabled?: boolean;
    micEnabled?: boolean;
  }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setDevicePreferences({
        audioDevice: searchParams.get('audioDevice'),
        videoDevice: searchParams.get('videoDevice'),
        cameraEnabled: searchParams.get('cameraEnabled') !== 'false',
        micEnabled: searchParams.get('micEnabled') !== 'false',
      });
    }
  }, []);

  // Auto-connect to LiveKit room when session and user are ready
  useEffect(() => {
    if (session && user && !isConnected && Object.keys(devicePreferences).length > 0) {
      const userId = user.id || user.email || "anonymous";
      
      // Pass device preferences to connectToRoom
      connectToRoom(sessionId, userId, devicePreferences);
    }
  }, [session, user, isConnected, sessionId, connectToRoom, devicePreferences]);

  // Ensure local video is attached after connection
  useEffect(() => {
    if (isConnected) {
      setTimeout(() => {
        ensureLocalVideoAttached();
      }, 1000); // Give some time for tracks to be published
    }
  }, [isConnected, ensureLocalVideoAttached]);

  // Calculate total participant count (live participants + host)
  const totalParticipantCount = liveParticipantCount + 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">✕</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Session Not Found
            </h2>
            <p className="text-gray-400">
              {error ||
                "The session you're looking for doesn't exist or has ended."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <SessionHeader
        session={session}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isConnected={isConnected}
        participantCount={totalParticipantCount}
        formatDuration={formatDuration}
      />

      <div className="flex-1 flex">
        <VideoArea
          localVideoRef={localVideoRef as RefObject<HTMLDivElement>}
          remoteVideosRef={remoteVideosRef as RefObject<HTMLDivElement>}
          participants={participants}
          liveParticipantCount={liveParticipantCount}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
        />

        <SessionSidebar
          session={session}
          userId={user?.id || user?.email || "anonymous"}
          copyInviteLink={() => copyInviteLink(session)}
          toggleRecording={() => toggleRecording(sessionId, user?.id || user?.email || "anonymous")}
          isRecording={isRecording}
          recordingError={recordingError}
        />
      </div>

      <SessionControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
        handleEndSession={handleEndSession}
      />
    </div>
  );
}
