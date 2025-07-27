import { UploadChunkToServer } from "@/services/upload";
import { SessionRefs } from "./types";
import { Room } from "livekit-client";

export const createRecordingHandlers = (
  refs: SessionRefs,
  setRecordingError: React.Dispatch<React.SetStateAction<string | null>>,
  participantId: string | null,
  room: Room | null
) => {
  let compositeCanvas: HTMLCanvasElement | null = null;
  let canvasContext: CanvasRenderingContext2D | null = null;
  let audioContext: AudioContext | null = null;
  let mixedAudioDestination: MediaStreamAudioDestinationNode | null = null;
  let animationFrameId: number | null = null;

  const createCompositeStream = async (): Promise<MediaStream> => {
    console.log('🎬 Creating composite stream with all participants');
    
    // Create canvas for video composition
    compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = 1280;
    compositeCanvas.height = 720;
    canvasContext = compositeCanvas.getContext('2d')!;

    // Create audio context for audio mixing
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    mixedAudioDestination = audioContext.createMediaStreamDestination();

    // Get all video elements (local + remote participants)
    const allVideoElements: { element: HTMLVideoElement; label: string }[] = [];
    
    // Get local video
    const localVideoElement = refs.localVideoRef.current?.querySelector('video') as HTMLVideoElement;
    if (localVideoElement && localVideoElement.srcObject) {
      allVideoElements.push({ element: localVideoElement, label: 'Local' });
      console.log('📹 Added local video to composite');
    }

    // Get remote participant videos
    if (refs.remoteVideosRef.current) {
      const remoteVideos = refs.remoteVideosRef.current.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
      remoteVideos.forEach((video, index) => {
        if (video.srcObject) {
          allVideoElements.push({ element: video, label: `Participant ${index + 1}` });
          console.log(`📹 Added remote video ${index + 1} to composite`);
        }
      });
    }

    // Collect all audio streams for mixing
    const audioSources: MediaStreamAudioSourceNode[] = [];
    
    // Add local audio
    if (room?.localParticipant) {
      room.localParticipant.audioTrackPublications.forEach((publication) => {
        if (publication.track && publication.track.mediaStream) {
          const audioSource = audioContext!.createMediaStreamSource(publication.track.mediaStream);
          audioSource.connect(mixedAudioDestination!);
          audioSources.push(audioSource);
          console.log('🎤 Added local audio to mix');
        }
      });
    }

    // Add remote participants' audio
    if (room) {
      room.remoteParticipants.forEach((participant, identity) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track && publication.track.mediaStream) {
            const audioSource = audioContext!.createMediaStreamSource(publication.track.mediaStream);
            audioSource.connect(mixedAudioDestination!);
            audioSources.push(audioSource);
            console.log(`🎤 Added ${identity} audio to mix`);
          }
        });
      });
    }

    // Function to draw composite frame
    const drawCompositeFrame = () => {
      if (!canvasContext || !compositeCanvas) return;

      // Clear canvas
      canvasContext.fillStyle = '#000000';
      canvasContext.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

      const videoCount = allVideoElements.length;
      if (videoCount === 0) {
        // No videos, draw placeholder
        canvasContext.fillStyle = '#333333';
        canvasContext.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        canvasContext.fillStyle = '#ffffff';
        canvasContext.font = '48px Arial';
        canvasContext.textAlign = 'center';
        canvasContext.fillText('No Video Sources', compositeCanvas.width / 2, compositeCanvas.height / 2);
        return;
      }

      // Layout videos based on count
      if (videoCount === 1) {
        // Single video - full screen
        const video = allVideoElements[0].element;
        canvasContext.drawImage(video, 0, 0, compositeCanvas.width, compositeCanvas.height);
        
        // Add label
        canvasContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasContext.fillRect(20, 20, 200, 40);
        canvasContext.fillStyle = '#ffffff';
        canvasContext.font = '20px Arial';
        canvasContext.textAlign = 'left';
        canvasContext.fillText(allVideoElements[0].label, 30, 45);
        
      } else if (videoCount === 2) {
        // Two videos - side by side
        const halfWidth = compositeCanvas.width / 2;
        allVideoElements.forEach((item, index) => {
          const x = index * halfWidth;
          canvasContext!.drawImage(item.element, x, 0, halfWidth, compositeCanvas!.height);
          
          // Add label
          canvasContext!.fillStyle = 'rgba(0, 0, 0, 0.7)';
          canvasContext!.fillRect(x + 20, 20, 200, 40);
          canvasContext!.fillStyle = '#ffffff';
          canvasContext!.font = '20px Arial';
          canvasContext!.textAlign = 'left';
          canvasContext!.fillText(item.label, x + 30, 45);
        });
        
      } else {
        // Multiple videos - grid layout
        const cols = Math.ceil(Math.sqrt(videoCount));
        const rows = Math.ceil(videoCount / cols);
        const cellWidth = compositeCanvas.width / cols;
        const cellHeight = compositeCanvas.height / rows;
        
        allVideoElements.forEach((item, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;
          
          canvasContext!.drawImage(item.element, x, y, cellWidth, cellHeight);
          
          // Add label
          canvasContext!.fillStyle = 'rgba(0, 0, 0, 0.7)';
          canvasContext!.fillRect(x + 10, y + 10, 150, 30);
          canvasContext!.fillStyle = '#ffffff';
          canvasContext!.font = '16px Arial';
          canvasContext!.textAlign = 'left';
          canvasContext!.fillText(item.label, x + 15, y + 30);
        });
      }
    };

    // Start animation loop for video composition
    const animate = () => {
      drawCompositeFrame();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Get video stream from canvas
    const videoStream = compositeCanvas.captureStream(30); // 30 FPS
    
    // Combine video and audio streams
    const compositeStream = new MediaStream();
    
    // Add video track
    videoStream.getVideoTracks().forEach(track => {
      compositeStream.addTrack(track);
    });
    
    // Add mixed audio track
    if (mixedAudioDestination) {
      mixedAudioDestination.stream.getAudioTracks().forEach(track => {
        compositeStream.addTrack(track);
      });
    }

    console.log(`🎬 Composite stream created with ${allVideoElements.length} video sources and mixed audio`);
    return compositeStream;
  };

  const cleanupCompositeStream = () => {
    console.log('🧹 Cleaning up composite stream resources');
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    
    mixedAudioDestination = null;
    canvasContext = null;
    compositeCanvas = null;
  };

  const startMediaRecording = async (sessionId: string, userId: string) => {
    try {
      setRecordingError(null);
      refs.isStoppingRef.current = false;
      refs.chunkIndexRef.current = 0;
      
      console.log('🎬 Starting multi-participant recording...');
      
      // Create composite stream with all participants
      const stream = await createCompositeStream();
      console.log('✅ Composite stream created successfully');

      refs.recordingStreamRef.current = stream;
      refs.mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 3000000, // Higher bitrate for multi-participant recording
        audioBitsPerSecond: 192000,  // Higher audio bitrate for mixed audio
      });

      refs.mediaRecorderRef.current.ondataavailable = async (e) => {
        console.log(`📦 Multi-participant chunk - Size: ${e.data.size}, Type: ${e.data.type}`);
        
        if (e.data.size > 0) {
          refs.chunkIndexRef.current++;
          const chunkStartTime = performance.now();
          const isFinalChunk = refs.isStoppingRef.current;
          
          const file = new File([e.data], `composite-chunk-${refs.chunkIndexRef.current}-${Date.now()}.webm`, { 
            type: "video/webm" 
          });
          
          console.log(`📦 Multi-participant file - Size: ${file.size}, Name: ${file.name}, Final: ${isFinalChunk}`);
          
          try {
            const currentParticipantId = participantId || userId;
            console.log(`🔧 Recording upload - SessionID: ${sessionId}, UserID: ${userId}, ParticipantID: ${currentParticipantId}`);
            
            await UploadChunkToServer({ 
              file, 
              sessionId, 
              userId, 
              participantId: currentParticipantId, // Use the actual participantId, not composite
              chunkIndex: refs.chunkIndexRef.current,
              isFinal: isFinalChunk
            });
            const uploadTime = performance.now() - chunkStartTime;
            console.log(`✅ Multi-participant chunk ${refs.chunkIndexRef.current}: ${(file.size / 1024 / 1024).toFixed(2)}MB, ${uploadTime.toFixed(0)}ms, Final: ${isFinalChunk}`);
          } catch (err) {
            console.error(`❌ Multi-participant chunk ${refs.chunkIndexRef.current} upload error:`, err);
            setRecordingError("Failed to upload multi-participant recording chunk");
          }
        } else {
          console.log("📦 Received empty multi-participant data chunk");
        }
      };

      refs.mediaRecorderRef.current.onstart = () => {
        console.log('🎬 Multi-participant recording started');
        refs.chunkIntervalRef.current = setInterval(() => {
          if (refs.mediaRecorderRef.current && refs.mediaRecorderRef.current.state === 'recording') {
            refs.mediaRecorderRef.current.requestData();
          }
        }, 5000);
      };

      refs.mediaRecorderRef.current.onstop = () => {
        console.log('⏹️ Multi-participant recording stopped');
        if (refs.chunkIntervalRef.current) {
          clearInterval(refs.chunkIntervalRef.current);
          refs.chunkIntervalRef.current = null;
        }
        cleanupCompositeStream();
      };

      refs.mediaRecorderRef.current.onerror = (event) => {
        console.error("❌ Multi-participant MediaRecorder error:", event);
        setRecordingError("Multi-participant recording error occurred");
        cleanupCompositeStream();
      };

      refs.mediaRecorderRef.current.start();
      console.log('✅ Multi-participant recording started successfully');
      
    } catch (err) {
      console.error("❌ Failed to start multi-participant recording:", err);
      setRecordingError("Failed to start multi-participant recording");
      cleanupCompositeStream();
      throw err;
    }
  };

  const stopMediaRecording = () => {
    console.log('⏹️ Stopping multi-participant recording...');
    
    // Clear the chunk interval first
    if (refs.chunkIntervalRef.current) {
      clearInterval(refs.chunkIntervalRef.current);
      refs.chunkIntervalRef.current = null;
    }
    
    if (refs.mediaRecorderRef.current && refs.mediaRecorderRef.current.state !== "inactive") {
      // Set the stopping flag BEFORE stopping to mark the final chunk
      refs.isStoppingRef.current = true;
      refs.mediaRecorderRef.current.stop();
    }
    
    // Stop recording stream tracks
    if (refs.recordingStreamRef.current) {
      refs.recordingStreamRef.current.getTracks().forEach((track) => {
        console.log(`🛑 Stopping track: ${track.kind}`);
        track.stop();
      });
      refs.recordingStreamRef.current = null;
    }
    
    // Cleanup composite stream resources
    cleanupCompositeStream();
    console.log('✅ Multi-participant recording stopped and cleaned up');
  };

  return {
    startMediaRecording,
    stopMediaRecording,
  };
};
