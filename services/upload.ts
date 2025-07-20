// lib/upload.ts

export const UploadChunkToServer = async ({
  file,
  sessionId,
  participantId, // ADDED: The ID of the participant in the session
  chunkIndex,    // ADDED: The index of this specific chunk
  userId,
  type = "AUDIO_VIDEO",
  isFinal = false,
}: {
  file: File;
  sessionId: string;
  participantId: string; // ADDED
  chunkIndex: number;    // ADDED
  userId: string;
  type?: string;
  isFinal?: boolean;
}) => {
  console.log(`[UPLOAD-SERVICE] Uploading chunk #${chunkIndex}. Final: ${isFinal}, Size: ${file.size} bytes`);
  const startTime = performance.now();
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sessionId", sessionId);
  formData.append("participantId", participantId); // ADDED
  formData.append("chunkIndex", chunkIndex.toString()); // ADDED
  formData.append("userId", userId); // Keep for downstream workers if needed
  formData.append("type", type);
  if (isFinal) {
    formData.append("isFinal", "true");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`[UPLOAD-SERVICE] Upload timeout after 30 seconds`);
    controller.abort();
  }, 30000);

  try {
    // Ensure this matches the actual API route file path
    const res = await fetch("/api/upload-chunk", {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: {
        'X-Upload-Start-Time': startTime.toString(),
      },
    });

    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;
    console.log(`[UPLOAD-SERVICE] Request completed in: ${duration.toFixed(2)}ms`);

    if (!res.ok) {
      let errorMessage = `Upload failed with status ${res.status}`;
      try {
        const err = await res.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // Ignore if response is not JSON
      }
      console.error(`[UPLOAD-SERVICE] Upload failed:`, errorMessage);
      throw new Error(errorMessage);
    }

    const result = await res.json();
    console.log(`[UPLOAD-SERVICE] Upload successful.`);
    return result;
    
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[UPLOAD-SERVICE] Upload aborted after ${duration.toFixed(2)}ms`);
      throw new Error('Upload timeout - please try again');
    }
    
    console.error(`[UPLOAD-SERVICE] Upload error after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};
