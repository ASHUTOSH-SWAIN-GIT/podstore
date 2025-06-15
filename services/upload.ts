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

  const res = await fetch("/app/api/upload-chunk", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "upload failed");
  }

  return res.json;
};
