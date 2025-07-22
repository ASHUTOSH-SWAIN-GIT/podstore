import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Wifi, WifiOff } from "lucide-react";

interface SessionHeaderProps {
  session: any;
  isRecording: boolean;
  recordingDuration: number;
  isConnected: boolean;
  participantCount: number;
  formatDuration: (seconds: number) => string;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  isRecording,
  recordingDuration,
  isConnected,
  participantCount,
  formatDuration,
}) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-card-foreground">
            {session?.title || "Recording Session"}
          </h1>
          
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
            
            <Badge variant="outline" className="text-muted-foreground border-border">
              <Users className="w-3 h-3 mr-1" />
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isRecording && (
            <div className="flex items-center space-x-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-destructive">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};