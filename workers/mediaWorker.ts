import "dotenv/config";
import { Worker, Queue } from "bullmq";
// UPDATED: The import for your new conversion function
import { convertWebmToMp4 } from "../lib/utils/ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/utils/prisma";
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

// Create queue instance to check job counts
const mediaQueue = new Queue('media-processing', {
  connection: {
    url: process.env.REDIS_URL!,
  }
});

console.log("Starting media worker...");

const worker = new Worker("media-processing", async (job) => {
  const workerPickupTime = Date.now();
  const jobCreatedTime = job.timestamp;
  const pickupDelay = workerPickupTime - jobCreatedTime;
  
  console.log(`[WORKER-TIMING] Job ${job.id} picked up - Delay: ${pickupDelay}ms`);

  const processingStartTime = Date.now();
  
  // Check queue status (simplified logging)
  const [waiting, active] = await Promise.all([
    mediaQueue.getWaiting(),
    mediaQueue.getActive()
  ]);
  
  console.log(`[WORKER] Queue: ${waiting.length} waiting, ${active.length} active`);
  console.log(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);
  
  if (job.name !== "convert-and-upload") {
    console.log(`Skipping job ${job.name} - not a convert-and-upload job`);
    return;
  }

  const { fileBuffer, sessionId, userId, type = "AUDIO_VIDEO" } = job.data;
  console.log(`[WORKER] Job data: session=${sessionId}, user=${userId}, type=${type}, bufferSize=${fileBuffer?.length || 0}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    console.error(`[WORKER] CRITICAL: Buffer is empty!`);
    throw new Error("Buffer is empty - cannot process file");
  }

  // Write buffer to temp .webm file
  const fileId = uuidv4();
  const tmpWebm = path.join("/tmp", `${fileId}.webm`);
  let tmpMp4: string | undefined;

  try {
    console.log(`[WORKER] Writing buffer to: ${tmpWebm}`);
    
    const writeStartTime = Date.now();
    // Convert Array back to Buffer efficiently
    const buffer = Buffer.from(fileBuffer);
    fs.writeFileSync(tmpWebm, buffer);
    const writeEndTime = Date.now();
    console.log(`[WORKER-TIMING] File write: ${writeEndTime - writeStartTime}ms`);

    // Convert WebM to MP4
    console.log(`[WORKER] Converting: ${tmpWebm}`);
    const ffmpegStartTime = Date.now();
    tmpMp4 = await convertWebmToMp4(tmpWebm);
    const ffmpegEndTime = Date.now();
    console.log(`[WORKER-TIMING] FFmpeg: ${ffmpegEndTime - ffmpegStartTime}ms`);

    // Upload to Backblaze
    console.log(`[WORKER] Uploading to B2...`);
    const b2StartTime = Date.now();
    await b2.authorize();
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    
    const mp4Buffer = fs.readFileSync(tmpMp4);
    const b2FileName = `media/${fileId}.mp4`;
    
    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: b2FileName,
      data: mp4Buffer,
      mime: "video/mp4",
      hash: "do_not_verify",
    });

    const signedUrl = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID!,
      fileNamePrefix: b2FileName,
      validDurationInSeconds: 3600,
    });

    const downloadUrl = `${process.env.B2_DOWNLOAD_URL}/${b2FileName}?Authorization=${signedUrl.data.authorizationToken}`;
    
    const b2EndTime = Date.now();
    console.log(`[WORKER-TIMING] B2 upload: ${b2EndTime - b2StartTime}ms`);

    // Save metadata to DB
    const dbStartTime = Date.now();
    await prisma.mediaFile.create({
      data: {
        sessionId,
        url: downloadUrl,
        type,
        status: "COMPLETE",
        s3Key: b2FileName,
        isFinal: false,
      },
    });
    const dbEndTime = Date.now();
    console.log(`[WORKER-TIMING] Database: ${dbEndTime - dbStartTime}ms`);

    // Cleanup
    fs.unlinkSync(tmpWebm);
    fs.unlinkSync(tmpMp4);

    const processingEndTime = Date.now();
    const totalTime = processingEndTime - processingStartTime;
    console.log(`[WORKER] Job ${job.id} completed in ${totalTime}ms`);
    
    // Auto-remove completed job
    try {
      await job.remove();
      console.log(`[WORKER] Job ${job.id} removed from queue`);
    } catch (deleteErr) {
      console.error(`Failed to delete job ${job.id}:`, deleteErr);
    }
    
  } catch (err) {
    const errorTime = Date.now();
    const totalErrorTime = errorTime - processingStartTime;
    console.error(`[WORKER] Job ${job.id} failed after ${totalErrorTime}ms:`, err);
    
    // Cleanup on error
    if (fs.existsSync(tmpWebm)) fs.unlinkSync(tmpWebm);
    if (tmpMp4 && fs.existsSync(tmpMp4)) fs.unlinkSync(tmpMp4);
    throw err;
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
  concurrency: 5,
  lockDuration: 10 * 60 * 1000,
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
});

// Auto-remove failed jobs from queue
worker.on('failed', async (job, err) => {
  console.error(`[WORKER-FAILED] Job ${job?.id} failed with error: ${err.message}`);
  console.error(`[WORKER-FAILED] Job data:`, job?.data);
  console.error(`[WORKER-FAILED] Attempt ${job?.attemptsMade} of ${job?.opts?.attempts || 1}`);
  
  const maxAttempts = job?.opts?.attempts || 1;
  const currentAttempt = job?.attemptsMade || 0;
  
  if (currentAttempt >= maxAttempts) {
    console.log(`[WORKER-FAILED] Job ${job?.id} has exhausted all ${maxAttempts} attempts, removing from queue...`);
    try {
      await job?.remove();
      console.log(`  Failed job ${job?.id} has been automatically removed from queue`);
    } catch (removeErr) {
      console.error(`[WORKER-FAILED] Failed to remove job ${job?.id}:`, removeErr);
    }
  } else {
    console.log(`[WORKER-FAILED] Job ${job?.id} will be retried (attempt ${currentAttempt + 1}/${maxAttempts})`);
  }
});

// Log successful completions
worker.on('completed', (job) => {
  console.log(`[WORKER-SUCCESS] Job ${job.id} completed successfully`);
});

console.log("Media worker is ready and listening for jobs...");