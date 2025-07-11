import "dotenv/config";
import { Worker, Queue } from "bullmq";
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

new Worker("media-processing", async (job) => {
  // Check queue status
  const waiting = await mediaQueue.getWaiting();
  const active = await mediaQueue.getActive();
  const completed = await mediaQueue.getCompleted();
  const failed = await mediaQueue.getFailed();
  
  console.log(`Queue status - Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`);
  console.log(`Processing job: ${job.name} with ID: ${job.id}`);
  
  if (job.name !== "convert-and-upload") {
    console.log(`Skipping job ${job.name} - not a convert-and-upload job`);
    return;
  }

  const { fileBuffer, sessionId, userId, type = "AUDIO_VIDEO" } = job.data;
  console.log(`Job data: sessionId=${sessionId}, userId=${userId}, type=${type}, bufferSize=${fileBuffer?.length || 0}`);

  // Write buffer to temp .webm file
  const fileId = uuidv4();
  const tmpWebm = path.join("/tmp", `${fileId}.webm`);
  const tmpMp4 = path.join("/tmp", `${fileId}.mp4`);

  try {
    console.log(`Writing buffer to temp file: ${tmpWebm}`);
    fs.writeFileSync(tmpWebm, Buffer.from(fileBuffer));

    // Convert using FFmpeg
    console.log("Converting:", tmpWebm);
    await convertWebmToMp4(tmpWebm);
    console.log("Conversion complete:", tmpMp4);

    // Authorize and upload mp4 to Backblaze
    console.log("Authorizing B2...");
    await b2.authorize();
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    
    console.log("Reading MP4 file for upload...");
    const mp4Buffer = fs.readFileSync(tmpMp4);
    const b2FileName = `media/${fileId}.mp4`;
    
    console.log(`Uploading to B2: ${b2FileName}`);
    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: b2FileName,
      data: mp4Buffer,
      mime: "video/mp4",
      hash: "do_not_verify",
    });
    const fileUrl = `${process.env.B2_PUBLIC_URL}/${b2FileName}`;
    console.log(`Upload complete: ${fileUrl}`);

    // Save metadata to DB
    console.log("Saving metadata to database...");
    await prisma.mediaFile.create({
      data: {
        sessionId,
        url: fileUrl,
        type,
        status: "COMPLETE",
        s3Key: b2FileName,
        isFinal: false,
      },
    });

    // Cleanup
    fs.unlinkSync(tmpWebm);
    fs.unlinkSync(tmpMp4);

    console.log("Job completed successfully:", job.id);
    
    // Auto-delete the completed job from queue
    try {
      await job.remove();
      console.log(`🗑️  Job with ID ${job.id} has been automatically deleted from queue`);
    } catch (deleteErr) {
      console.error(`Failed to delete job ${job.id}:`, deleteErr);
    }
    
    // Show updated queue status after completion
    const waitingAfter = await mediaQueue.getWaiting();
    console.log(`Jobs remaining in queue: ${waitingAfter.length}`);
  } catch (err) {
    console.error("Worker failed:", err);
    // Cleanup temp files if they exist
    if (fs.existsSync(tmpWebm)) fs.unlinkSync(tmpWebm);
    if (fs.existsSync(tmpMp4)) fs.unlinkSync(tmpMp4);
    throw err; // will trigger retry if enabled
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
});

console.log("Media worker is ready and listening for jobs...");
