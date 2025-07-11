export const UploadChunkToServer = async ({
  file,
  sessionId,
  userId,
  type = "AUDIO_VIDEO",
}: {
  file: File;
  sessionId: string;
  userId: string;
  type?: string;
}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sessionId", sessionId);
  formData.append("userId", userId);
  formData.append("type", type);

  const res = await fetch("/api/upload-chunk", {
    method: "POST",
    body: formData,
  });

  

  if (!res.ok) {
    let errorMessage = "upload failed";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {
      // If response is not JSON, use status text or default message
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return res.json();
};
