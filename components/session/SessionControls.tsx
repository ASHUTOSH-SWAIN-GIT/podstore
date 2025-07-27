import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Square, AlertCircle, Circle } from "lucide-react";

interface SessionControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isRecording: boolean;
  recordingError: string | null;
  isHost?: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleRecording: () => void;
  handleEndSession: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isMuted,
  isVideoOff,
  isRecording,
  recordingError,
  isHost = false,
  toggleMute,
  toggleVideo,
  toggleRecording,
  handleEndSession,
}) => {
  return (
    <div className="bg-card border-t border-border p-4">
      <div className="flex items-center justify-center space-x-4">
         <Button
          onClick={toggleRecording}
          size="lg"
          className={`px-6 h-12 ${
            isRecording 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2 text-white fill-white" />
              <span className="text-white">Stop Recording</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 mr-2 text-white fill-white" />
              <span className="text-white">Start Recording</span>
            </>
          )}
        </Button>

        <Button
          onClick={toggleMute}
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          className="rounded-full h-12 w-12 p-0"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleVideo}
          variant={isVideoOff ? "destructive" : "secondary"}
          size="lg"
          className="rounded-full h-12 w-12 p-0"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button
          onClick={handleEndSession}
          variant="destructive"
          size="lg"
          className="rounded-full h-12 w-12 p-0"
          title={isHost ? "End Session (Will start processing workers)" : "Leave Session"}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {recordingError && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg max-w-md">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{recordingError}</p>
          </div>
        </div>
      )}
    </div>
  );
};