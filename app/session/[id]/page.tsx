"use client";

import React, { RefObject, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionControls } from "@/hooks/useSessionControls";
import AuthGuard from "@/components/auth/AuthGuard";
import { SessionHeader } from "@/components/session/SessionHeader";
import { VideoArea } from "@/components/session/VideoArea";
import { SessionControls } from "@/components/session/SessionControls";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const { session, participants, isLoading, error } = useSessionData(sessionId);
  const {
    isRecording,
    recordingDuration,
    recordingError,
    isMuted,
    isVideoOff,
    isConnected,
    isConnecting,
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

  // Connection attempt tracker to prevent multiple calls
  const connectionAttemptedRef = useRef<boolean>(false);

  // Redirect unauthenticated users to login via join flow
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to auth page with session redirect
      router.push(`/auth?redirect=/session/${sessionId}`);
    }
  }, [authLoading, user, sessionId, router]);

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
    if (session && user && !isConnected && !isConnecting && !connectionAttemptedRef.current) {
      const userId = user.id || user.email || "anonymous";
      console.log('Attempting to connect to room:', sessionId, 'for user:', userId);
      
      connectionAttemptedRef.current = true;

      // Add a small delay to ensure all state is settled
      const timeoutId = setTimeout(() => {
        connectToRoom(sessionId, userId);
      }, 500);

      return () => clearTimeout(timeoutId);
    }

    // Reset the connection attempted flag if we're disconnected
    if (!isConnected && !isConnecting) {
      connectionAttemptedRef.current = false;
    }
  }, [session, user, isConnected, isConnecting, sessionId, connectToRoom]);

  // Ensure local video is attached after connection
  useEffect(() => {
    if (isConnected) {
      // Single attempt after a reasonable delay to let tracks be published
      const timeoutId = setTimeout(() => {
        ensureLocalVideoAttached();
      }, 1500); // One attempt after 1.5 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, ensureLocalVideoAttached]);

  // Calculate total participant count (live participants + host)
  const totalParticipantCount = liveParticipantCount + 1;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto border border-destructive/20">
            <span className="text-destructive text-2xl">✕</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Session Not Found
            </h2>
            <p className="text-muted-foreground">
              {error ||
                "The session you're looking for doesn't exist or has ended."}
            </p>
          </div>
        </div>
      </div>
    );
  }

 

  // Check if current user is the host
  const isHost = session?.hostId === (user?.id || user?.email);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SessionHeader
        session={session}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isConnected={isConnected}
        participantCount={totalParticipantCount}
        formatDuration={formatDuration}
      />

      {/* Make this flex-1 to fill available space */}
      <div className="flex-1 min-h-0">
        <VideoArea
          localVideoRef={localVideoRef as RefObject<HTMLDivElement>}
          remoteVideosRef={remoteVideosRef as RefObject<HTMLDivElement>}
          participants={participants}
          liveParticipantCount={liveParticipantCount}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          inviteLink={`${window?.location?.origin}/join/${session?.joinToken}` || ""}
        />
      </div>

      <SessionControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isRecording={isRecording}
        recordingError={recordingError}
        isHost={isHost}
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
        toggleRecording={() => toggleRecording(sessionId, user?.id || user?.email || "anonymous")}
        handleEndSession={() => handleEndSession(sessionId, user?.id || user?.email || "anonymous")}
      />
      </div>
    </AuthGuard>
  );
}