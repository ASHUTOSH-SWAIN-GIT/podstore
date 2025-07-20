// lib/workers/conversionWorker.ts

import "dotenv/config";
import { Worker, Queue } from "bullmq";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Define the next queue in the chain for handoff
const uploadQueue = new Queue('upload-file', {
  connection: {
    url: process.env.REDIS_URL!,
  }
});

console.log("🚀 Starting Media Conversion Worker...");

// This worker listens to the "media-processing" queue
const worker = new Worker("media-processing", async (job) => {
  // The stitching worker sends a job with the name "convert-to-mp4"
  if (job.name !== "convert-to-mp4") {
    console.log(`[CONVERT-WORKER] Skipping job with incorrect name: ${job.name}`);
    return;
  }

  // Destructure the data sent from the stitching worker
  const { stitchedFilePath, sessionId, userId } = job.data;
  console.log(`[CONVERT-WORKER] Processing job ${job.id} for file: ${stitchedFilePath}`);
  
  if (!stitchedFilePath || !fs.existsSync(stitchedFilePath)) {
    throw new Error(`Input file does not exist at path: ${stitchedFilePath}`);
  }

  // The final MP4 will be created in the same temporary directory
  const finalMp4Path = stitchedFilePath.replace('.webm', '.mp4');

  try {
    console.log(`[CONVERT-WORKER] Converting ${stitchedFilePath} to MP4...`);
    const startTime = Date.now();
    
    // Use ffmpeg to convert the stitched webm file to mp4
    // The '-y' flag overwrites the output file if it exists
    await execAsync(`ffmpeg -i "${stitchedFilePath}" -y "${finalMp4Path}"`);
    
    const endTime = Date.now();
    console.log(`[CONVERT-WORKER] Conversion complete: ${finalMp4Path}. Took ${endTime - startTime}ms.`);

    // Hand off the final MP4 file to the upload queue
    // The upload worker will listen for jobs with the name "upload-file"
    await uploadQueue.add("upload-file", {
      mp4Path: finalMp4Path,
      sessionId,
      userId,
      type: "AUDIO_VIDEO_FINAL", // Set a specific type for the final file
    });
    console.log(`[CONVERT-WORKER] Handed off ${finalMp4Path} to the upload queue.`);
    
  } catch (err) {
    console.error(`[CONVERT-WORKER] Job ${job.id} failed:`, err);
    
    // If conversion fails, clean up the final mp4 if it was created
    if (fs.existsSync(finalMp4Path)) {
      fs.unlinkSync(finalMp4Path);
    }
    throw err; // Re-throw the error to mark the job as failed
  } finally {
    // Clean up the original stitched .webm file that this worker received
    if (fs.existsSync(stitchedFilePath)) {
      fs.unlinkSync(stitchedFilePath);
      console.log(`[CONVERT-WORKER] Cleaned up intermediate stitched file: ${stitchedFilePath}`);
    }
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
  concurrency: 5, // Conversion is CPU-intensive, so concurrency should be managed
});

worker.on('failed', async (job, err) => {
  console.error(`[CONVERT-WORKER-FAILED] Job ${job?.id} failed with error: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[CONVERT-WORKER-SUCCESS] Job ${job.id} completed successfully`);
});

console.log("✅ Media conversion worker is ready and listening for jobs on 'media-processing'.");
