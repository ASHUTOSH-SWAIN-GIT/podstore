export const UploadChunkToServer = async ({
  file,
  sessionId,
  userId,
  type = "AUDIO_VIDEO",
  isFinal = false, // Add the 'isFinal' flag
}: {
  file: File;
  sessionId: string;
  userId: string;
  type?: string;
  isFinal?: boolean; // Add to the type definition
}) => {
  console.log(`[UPLOAD-SERVICE] Uploading chunk. Final: ${isFinal}, Size: ${file.size} bytes`);
  const startTime = performance.now();
  
  const formData = new FormData();
  formData.append("file", file); // The actual file chunk
  formData.append("sessionId", sessionId);
  formData.append("userId", userId);
  formData.append("type", type);
  // Add the isFinal flag to the form data if it's true
  if (isFinal) {
    formData.append("isFinal", "true");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`[UPLOAD-SERVICE] Upload timeout after 30 seconds`);
    controller.abort();
  }, 30000);

  try {
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
        errorMessage = res.statusText || errorMessage;
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