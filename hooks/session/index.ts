import { useState, useEffect, useRef } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
} from "livekit-client";
import { livekitConfig } from "@/lib/livekit-config";
import { SessionControls, SessionRefs } from "./types";
import { createEventHandlers } from "./eventHandlers";
import { createRecordingHandlers } from "./recording";
import { createConnectionHandlers } from "./connection";
import { createUtilityFunctions } from "./utils";
import { createSessionActions } from "./actions";

export const useSessionControls = (): SessionControls => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [liveParticipantCount, setLiveParticipantCount] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Refs
  const refs: SessionRefs = {
    localVideoRef: useRef<HTMLDivElement>(null),
    remoteVideosRef: useRef<HTMLDivElement>(null),
    recordingIntervalRef: useRef<NodeJS.Timeout | null>(null),
    videoAttachingRef: useRef<boolean>(false),
    connectionAttemptRef: useRef<boolean>(false),
    mediaRecorderRef: useRef<MediaRecorder | null>(null),
    recordingStreamRef: useRef<MediaStream | null>(null),
    chunkIntervalRef: useRef<NodeJS.Timeout | null>(null),
    isStoppingRef: useRef<boolean>(false),
    chunkIndexRef: useRef<number>(0),
  };

  // Initialize LiveKit room
  useEffect(() => {
    console.log('🏗️ Initializing LiveKit room...');
    const newRoom = new Room({
      ...livekitConfig.roomOptions,
      dynacast: true,
      reconnectPolicy: {
        nextRetryDelayInMs: (context) => {
          console.log('🔄 Reconnect attempt:', context.retryCount);
          if (context.retryCount > 3) {
            console.log('🚫 Max reconnect attempts reached');
            return null;
          }
          return Math.min(context.retryCount * 2000, 10000);
        },
      },
    });

    // Add comprehensive debug logging for room events
    newRoom.on(RoomEvent.Connected, () => {
      console.log('✅ Room connected successfully');
      setIsConnected(true);
      setIsConnecting(false);
    });

    newRoom.on(RoomEvent.Disconnected, (reason) => {
      console.log('❌ Room disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      refs.connectionAttemptRef.current = false; // Clear connection flag on any disconnect
    });

    newRoom.on(RoomEvent.Reconnecting, () => {
      console.log('🔄 Room reconnecting...');
      setIsConnecting(true);
    });

    newRoom.on(RoomEvent.Reconnected, () => {
      console.log('✅ Room reconnected successfully');
      setIsConnected(true);
      setIsConnecting(false);
      refs.connectionAttemptRef.current = false;
    });

    newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('🔗 Room connection state changed to:', state);
      switch (state) {
        case ConnectionState.Connected:
          setIsConnected(true);
          setIsConnecting(false);
          refs.connectionAttemptRef.current = false;
          break;
        case ConnectionState.Connecting:
          setIsConnecting(true);
          break;
        case ConnectionState.Disconnected:
          setIsConnected(false);
          setIsConnecting(false);
          refs.connectionAttemptRef.current = false;
          break;
        case ConnectionState.Reconnecting:
          setIsConnecting(true);
          break;
      }
    });

    setRoom(newRoom);

    return () => {
      console.log('🧹 Cleaning up room...');
      if (newRoom.state !== ConnectionState.Disconnected) {
        newRoom.removeAllListeners();
        newRoom.disconnect();
      }
    };
  }, []);

  // Set participant ID when connected
  useEffect(() => {
    if (room && isConnected && room.localParticipant) {
      const newParticipantId = room.localParticipant.identity;
      if (newParticipantId && newParticipantId !== participantId) {
        console.log('👤 Setting participant ID:', newParticipantId);
        setParticipantId(newParticipantId);
      }
    }
  }, [room, isConnected, participantId]);

  // Create utility functions
  const utilityFunctions = createUtilityFunctions(refs, room);

  // Create event handlers
  const eventHandlers = createEventHandlers(
    refs,
    setLiveParticipantCount,
    setIsConnected,
    setIsConnecting,
    refs.connectionAttemptRef
  );

  // Create recording handlers
  const recordingHandlers = createRecordingHandlers(
    refs,
    setRecordingError,
    participantId,
    room
  );

  // Create connection handlers
  const connectionHandlers = createConnectionHandlers(
    room,
    refs,
    isConnecting,
    setIsConnected,
    setIsConnecting,
    setLiveParticipantCount,
    setIsMuted,
    setIsVideoOff,
    eventHandlers,
    utilityFunctions.ensureLocalVideoAttached
  );

  // Create session actions
  const sessionActions = createSessionActions(
    refs,
    room,
    isRecording,
    isMuted,
    isVideoOff,
    setIsRecording,
    setRecordingDuration,
    setIsMuted,
    setIsVideoOff,
    setRecordingError,
    recordingHandlers,
    utilityFunctions.ensureLocalVideoAttached
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refs.recordingIntervalRef.current) {
        clearInterval(refs.recordingIntervalRef.current);
      }
      if (room && room.state !== 'disconnected') {
        console.log('Disconnecting room on cleanup');
        room.removeAllListeners();
        room.disconnect();
      }
      recordingHandlers.stopMediaRecording();
    };
  }, [room]);

  return {
    // State
    isRecording,
    recordingDuration,
    recordingError,
    isMuted,
    isVideoOff,
    isConnected,
    isConnecting,
    participantId,
    localVideoRef: refs.localVideoRef,
    remoteVideosRef: refs.remoteVideosRef,
    room,
    liveParticipantCount,
    
    // Actions
    ...utilityFunctions,
    ...sessionActions,
    connectToRoom: connectionHandlers.connectToRoom,
  };
};
