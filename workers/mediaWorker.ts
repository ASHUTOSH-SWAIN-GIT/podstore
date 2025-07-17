import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { convertWebmToMp4 } from "../lib/utils/ffmpeg";
import fs from "fs";
import path from "path";

const uploadQueue = new Queue('upload-processing', {
  connection: {
    url: process.env.REDIS_URL!,
  }
});

console.log("Starting media conversion worker...");

const worker = new Worker("media-processing", async (job) => {
  console.log(`[CONVERT-WORKER] Processing job: ${job.name} (ID: ${job.id})`);
  
  if (job.name !== "convert-file") {
    console.log(`Skipping job with name: ${job.name}`);
    return;
  }

  // Handle the current data structure from upload-chunk API
  const { filePath, sessionId, userId, type = "AUDIO_VIDEO" } = job.data;
  
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Input file does not exist at path: ${filePath}`);
  }

  let tmpMp4: string | undefined;

  try {
    console.log(`[CONVERT-WORKER] Converting: ${filePath}`);
    const ffmpegStartTime = Date.now();
    tmpMp4 = await convertWebmToMp4(filePath);
    const ffmpegEndTime = Date.now();
    console.log(`[CONVERT-WORKER] FFmpeg conversion took: ${ffmpegEndTime - ffmpegStartTime}ms`);

    // Generate fileId from the session for consistent naming
    const fileId = `${sessionId}-${Date.now()}`;
    
    console.log(`[CONVERT-WORKER] Handing off to upload queue. MP4 path: ${tmpMp4}`);
    await uploadQueue.add("upload-file", {
      mp4Path: tmpMp4,
      sessionId,
      userId: userId || "unknown", // Provide fallback if userId not available
      type,
      fileId,
    });

    // Clean up the original stitched .webm file
    fs.unlinkSync(filePath);
    console.log(`[CONVERT-WORKER] Job ${job.id} completed. Original WebM file cleaned up.`);
    
  } catch (err) {
    console.error(`[CONVERT-WORKER] Job ${job.id} failed:`, err);
    
    // Cleanup on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (tmpMp4 && fs.existsSync(tmpMp4)) fs.unlinkSync(tmpMp4);
    throw err;
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
  concurrency: 5,
});

worker.on('failed', async (job, err) => {
  console.error(`[CONVERT-WORKER-FAILED] Job ${job?.id} failed with error: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[CONVERT-WORKER-SUCCESS] Job ${job.id} completed successfully`);
});

console.log("Media conversion worker is ready and listening for jobs...");