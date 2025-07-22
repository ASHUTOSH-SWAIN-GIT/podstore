import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, Square, AlertCircle } from "lucide-react";

interface SessionSidebarProps {
  session: any;
  userId: string;
  copyInviteLink: () => void;
  toggleRecording: () => void;
  isRecording: boolean;
  recordingError: string | null;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  session,
  userId,
  copyInviteLink,
  toggleRecording,
  isRecording,
  recordingError,
}) => {
  return (
    <div className="w-80 bg-card border-l border-border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Session Info</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="text-sm font-medium text-card-foreground">{session?.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Host</p>
            <p className="text-sm font-medium text-card-foreground">{session?.host?.name || "Unknown"}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Recording</h3>
        <div className="space-y-3">
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            className="w-full"
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>

          {recordingError && (
            <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{recordingError}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Invite</h3>
        <Button
          onClick={copyInviteLink}
          variant="outline"
          className="w-full"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Invite Link
        </Button>
      </div>
    </div>
  );
};