import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { VideoOff, MicOff, Users, Copy, Check } from "lucide-react";

interface Participant {
  id: string;
  role: string;
  user: {
    name: string;
  };
}

interface VideoAreaProps {
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideosRef: React.RefObject<HTMLDivElement | null>;
  participants: Participant[];
  liveParticipantCount: number;
  isVideoOff: boolean;
  isMuted: boolean;
  inviteLink: string;
}

/**
 * Renders the UI for inviting users when no participants are connected.
 */
const InvitePanel = ({
  inviteLink,
}: {
  inviteLink: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [inviteLink]);

  return (
    <div className="w-full h-full bg-card rounded-xl border border-border flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Users className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold text-card-foreground mb-2">Invite people</h2>
      <p className="text-muted-foreground mb-8">
        Share this link to invite people to your studio.
      </p>

      <div className="flex items-center space-x-2 bg-secondary border border-border rounded-lg p-2 w-full max-w-md mb-6">
        <p className="flex-1 text-left text-muted-foreground text-sm truncate px-2">
          {inviteLink}
        </p>
        <button
          onClick={handleCopyLink}
          className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center transition-colors ${
            isCopied
              ? "bg-green-600 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy link
            </>
          )}
        </button>
      </div>

      <div className="flex items-center my-6 w-full max-w-xs">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-muted-foreground text-sm">or</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-2 px-6 rounded-lg transition-colors">
        Invite by email
      </button>
    </div>
  );
};

/**
 * Renders the grid of remote participants.
 */
const ParticipantGrid = ({ 
  remoteVideosRef, 
  liveParticipantCount 
}: { 
  remoteVideosRef: React.RefObject<HTMLDivElement | null>, 
  liveParticipantCount: number 
}) => {
  return (
    <div className="h-full flex flex-col space-y-4 bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Participants ({liveParticipantCount})
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>
      
      <div
        ref={remoteVideosRef}
        className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 rounded-lg p-4 min-h-0"
      >
        {/* LiveKit will dynamically add participant video elements here */}
        {liveParticipantCount === 0 && (
          <div className="flex items-center justify-center text-muted-foreground">
            <p>Waiting for participants to join...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const VideoArea: React.FC<VideoAreaProps> = ({
  localVideoRef,
  remoteVideosRef,
  participants,
  liveParticipantCount,
  isVideoOff,
  isMuted,
  inviteLink,
}) => {
  return (
    <div className="w-full flex flex-row space-x-6 p-6 h-full overflow-hidden bg-background">
      {/* Left Panel: Host Video */}
      <div className="w-2/3 h-full bg-black rounded-xl border border-border overflow-hidden relative group shadow-lg flex-shrink-0">
        <div ref={localVideoRef} className="w-full h-full" />
        {isVideoOff && (
          <div className="absolute inset-0 bg-secondary flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Your camera is off</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-black/70 text-white border-border backdrop-blur-sm">
            You (Host) {isMuted && <MicOff className="w-3 h-3 ml-1" />}
          </Badge>
        </div>
      </div>

      {/* Right Panel: Participants or Invite Panel */}
      <div className="w-1/3 h-full flex flex-col">
        {liveParticipantCount > 0 ? (
          <div
            ref={remoteVideosRef}
            className="h-full w-full flex flex-col space-y-4"
          >
            {/* Participant videos will be injected here, stacking vertically */}
          </div>
        ) : (
          <InvitePanel inviteLink={inviteLink} />
        )}
      </div>
    </div>
  );
};