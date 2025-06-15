import { useState, useEffect } from "react";

interface UseAutoJoinProps {
  urlSessionId: string | null;
  urlUserId: string | null;
  selectedAudio: string;
  selectedVideo: string;
  isConnected: boolean;
  onAutoJoin: () => Promise<void>;
}

export const useAutoJoin = ({
  urlSessionId,
  urlUserId,
  selectedAudio,
  selectedVideo,
  isConnected,
  onAutoJoin,
}: UseAutoJoinProps) => {
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  useEffect(() => {
    const attemptAutoJoin = async () => {
      if (
        urlSessionId &&
        urlUserId &&
        selectedAudio &&
        selectedVideo &&
        !autoJoinAttempted &&
        !isConnected
      ) {
        console.log("Attempting auto-join...");
        setAutoJoinAttempted(true);
        setIsAutoJoining(true);

        try {
          await onAutoJoin();
          console.log("Auto-join successful!");
        } catch (error) {
          console.error("Auto-join failed:", error);
        } finally {
          setIsAutoJoining(false);
        }
      }
    };

    if (selectedAudio && selectedVideo) {
      attemptAutoJoin();
    }
  }, [
    urlSessionId,
    urlUserId,
    selectedAudio,
    selectedVideo,
    autoJoinAttempted,
    isConnected,
    onAutoJoin,
  ]);

  return {
    isAutoJoining,
    autoJoinAttempted,
  };
};
