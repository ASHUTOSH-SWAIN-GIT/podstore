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
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef<boolean>(false); // Flag to track if we're stopping
  const [isRecording, setIsRecording] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix hydration by ensuring client-side only operations
  useEffect(() => {
    setIsClient(true);
  }, []);

  const stopRecording = () => {
    // Set the stopping flag to prevent processing the final chunk
    isStoppingRef.current = true;
    
    // Clear the chunk interval first
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    // Reset the stopping flag after a short delay to allow the final chunk to be skipped
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 100);
  };

  const startRecording = async () => {
    if (!isClient || !navigator.mediaDevices) {
      setError("Media devices not available");
      return;
    }

    try {
      setError(null);
      isStoppingRef.current = false; // Reset stopping flag when starting
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      let chunkCount = 0;

      mediaRecorder.current.ondataavailable = async (e) => {
        console.log(`Data available - Size: ${e.data.size}, Type: ${e.data.type}`);
        
        // Skip processing if we're in the process of stopping
        if (isStoppingRef.current) {
          console.log(`Skipping chunk during stop - Size: ${e.data.size} bytes`);
          return;
        }
        
        if (e.data.size > 0) {
          chunkCount++;
          const chunkStartTime = performance.now();
          
          const file = new File([e.data], `useRecorder-chunk-${chunkCount}-${Date.now()}.webm`, { 
            type: "video/webm" 
          });
          
          console.log(`Created file - Size: ${file.size}, Name: ${file.name}`);
          
          try {
            await UploadChunkToServer({ file, sessionId, userId });
            const uploadTime = performance.now() - chunkStartTime;
            console.log(`Chunk ${chunkCount}: ${(file.size / 1024 / 1024).toFixed(2)}MB, ${uploadTime.toFixed(0)}ms`);
          } catch (err) {
            console.error(`useRecorder Chunk ${chunkCount} upload error:`, err);
            setError("Failed to upload recording chunk");
          }
        } else {
          console.log("Received empty data chunk");
        }
      };

      mediaRecorder.current.onstart = () => {
        setIsRecording(true);
        
        // Use manual requestData() every 5 seconds for reliable chunking
        chunkIntervalRef.current = setInterval(() => {
          if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.requestData();
          }
        }, 5000); // Exactly 5 seconds
      };

      mediaRecorder.current.onstop = () => {
        setIsRecording(false);
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }
      };

      mediaRecorder.current.onerror = (event) => {
        console.error("useRecorder MediaRecorder error:", event);
        setError("Recording error occurred");
        setIsRecording(false);
      };

      // Start recording WITHOUT timeslice - we'll use manual requestData() instead
      mediaRecorder.current.start();
      
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
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
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
