import { useRef, useState, useEffect, useCallback } from "react";
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
  const isStoppingRef = useRef<boolean>(false);
  const chunkIndexRef = useRef<number>(0); // Add chunk index tracking
  const [isRecording, setIsRecording] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    mediaRecorder.current = null;
    isStoppingRef.current = false;
    chunkIndexRef.current = 0; // Reset chunk index
    setIsRecording(false);
  }, []);

  const handleDataAvailable = useCallback(async (event: BlobEvent) => {
    if (event.data.size > 0) {
      const isFinalChunk = isStoppingRef.current;
      chunkIndexRef.current++; // Increment chunk index
      console.log(`Chunk received. Index: ${chunkIndexRef.current}, Final: ${isFinalChunk}, Size: ${event.data.size} bytes`);
      
      const file = new File([event.data], `chunk-${chunkIndexRef.current}-${Date.now()}.webm`, { type: "video/webm" });
      
      try {
        // Pass all required parameters including participantId and chunkIndex
        await UploadChunkToServer({ 
          file, 
          sessionId, 
          participantId: userId, // Use userId as participantId
          chunkIndex: chunkIndexRef.current,
          userId, 
          isFinal: isFinalChunk 
        });
        console.log(`Uploaded chunk ${chunkIndexRef.current}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (err) {
        console.error("Chunk upload failed:", err);
        setError("Failed to upload recording chunk. Please check connection.");
        cleanup();
      }
    } else {
      console.warn("Received empty data chunk.");
    }

    if (isStoppingRef.current) {
      cleanup();
    }
  }, [sessionId, userId, cleanup]);

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      // Set the stopping flag BEFORE stopping the recorder
      // This ensures the final chunk is marked as isFinal
      isStoppingRef.current = true;
      
      // Stop the recorder, which will trigger a final ondataavailable event
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (!isClient || !navigator.mediaDevices) {
      setError("Media devices are not available on this browser.");
      return;
    }

    try {
      setError(null);
      isStoppingRef.current = false;
      chunkIndexRef.current = 0; // Reset chunk index when starting
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = handleDataAvailable;
      
      recorder.onstop = () => {
        console.log("MediaRecorder stopped.");
        cleanup();
      };
      
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("A recording error occurred.");
        cleanup();
      };

      mediaRecorder.current = recorder;
      
      recorder.start(5000); // Use the built-in timeslice for simpler chunking
      setIsRecording(true);

    } catch (err) {
      console.error("Failed to start recording:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permission to use camera/microphone was denied.");
      } else {
        setError("Failed to access camera/microphone.");
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isRecording, toggleRecording, error };
};