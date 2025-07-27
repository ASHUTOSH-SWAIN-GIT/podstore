import {
  Room,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrackPublication,
  LocalParticipant,
} from "livekit-client";

export interface SessionState {
  isRecording: boolean;
  recordingDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  room: Room | null;
  liveParticipantCount: number;
  recordingError: string | null;
  participantId: string | null;
}

export interface SessionRefs {
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideosRef: React.RefObject<HTMLDivElement | null>;
  recordingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  videoAttachingRef: React.MutableRefObject<boolean>;
  connectionAttemptRef: React.MutableRefObject<boolean>;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  recordingStreamRef: React.MutableRefObject<MediaStream | null>;
  chunkIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isStoppingRef: React.MutableRefObject<boolean>;
  chunkIndexRef: React.MutableRefObject<number>;
}

export interface SessionActions {
  formatDuration: (seconds: number) => string;
  copyInviteLink: (session: any) => Promise<void>;
  toggleRecording: (sessionId?: string, userId?: string) => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  handleEndSession: (sessionId?: string, userId?: string) => Promise<void>;
  connectToRoom: (sessionId: string, userId: string) => Promise<void>;
  ensureLocalVideoAttached: () => void;
}

export interface SessionControls extends SessionState, SessionActions {
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideosRef: React.RefObject<HTMLDivElement | null>;
  room: Room | null;
  liveParticipantCount: number;
}
