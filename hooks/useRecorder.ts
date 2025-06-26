import { useRef, useState, useEffect } from "react";
import { UploadChunkToServer } from "@/services/upload";

export const useRecorder = ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) => {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix hydration by ensuring client-side only operations
  useEffect(() => {
    setIsClient(true);
  }, []);

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!isClient || !navigator.mediaDevices) {
      setError("Media devices not available");
      return;
    }

    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorder.current.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const file = new File([e.data], `chunk-${Date.now()}.webm`, { 
            type: "video/webm" 
          });
          
          try {
            await UploadChunkToServer({ file, sessionId, userId });
            console.log("Chunk uploaded successfully");
          } catch (err) {
            console.error("Chunk upload error:", err);
            setError("Failed to upload recording chunk");
          }
        }
      };

      mediaRecorder.current.onstart = () => {
        setIsRecording(true);
        console.log("Recording started");
      };

      mediaRecorder.current.onstop = () => {
        setIsRecording(false);
        console.log("Recording stopped");
      };

      mediaRecorder.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
        setIsRecording(false);
      };

      // Start recording with 5-second chunks
      mediaRecorder.current.start(5000);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access camera/microphone");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
    error,
    isClient,
  };
};
