// lib/workers/conversionWorker.ts

import "dotenv/config";
import { Worker } from "bullmq";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../lib/utils/prisma";

const execAsync = promisify(exec);

// --- R2 Client Initialization ---
const R2_ENABLED = 
  process.env.R2_ENDPOINT && 
  process.env.R2_ACCESS_KEY_ID && 
  process.env.R2_SECRET_ACCESS_KEY && 
  process.env.R2_BUCKET_NAME;

let s3Client: S3Client | null = null;
if (R2_ENABLED) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,  // Remove the extra https://
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  console.log("✅ Media conversion worker initialized with Cloudflare R2 support");
} else {
  console.warn("⚠️ Media conversion worker cannot upload to R2 - missing R2 credentials");
}

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
  console.log(`[CONVERT-WORKER] Job data: {`);
  console.log(`  stitchedFilePath: '${stitchedFilePath}',`);
  console.log(`  sessionId: '${sessionId}',`);
  console.log(`  userId: '${userId}'`);
  console.log(`}`);
  
  // Wait for file to exist with retries
  let fileExists = false;
  let retries = 0;
  const maxRetries = 10;
  
  while (!fileExists && retries < maxRetries) {
    if (fs.existsSync(stitchedFilePath)) {
      fileExists = true;
    } else {
      console.log(`[CONVERT-WORKER] File not found, waiting 500ms... (attempt ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
  }
  
  if (!fileExists) {
    throw new Error(`Input file does not exist at path after ${maxRetries} retries: ${stitchedFilePath}`);
  }

  // Log input file details
  const inputStats = fs.statSync(stitchedFilePath);
  console.log(`[CONVERT-WORKER] Input file details: {`);
  console.log(`  size: ${inputStats.size},`);
  console.log(`  sizeInMB: '${(inputStats.size / 1024 / 1024).toFixed(2)}',`);
  console.log(`  path: '${stitchedFilePath}',`);
  console.log(`  exists: ${fs.existsSync(stitchedFilePath)}`);
  console.log(`}`);

  // The final MP4 will be created in the same temporary directory
  const finalMp4Path = stitchedFilePath.replace('.webm', '.mp4');

  try {
    // 1. Convert WebM to MP4
    console.log(`[CONVERT-WORKER] Converting ${stitchedFilePath} to MP4...`);
    const startTime = Date.now();
    
    // Use ffmpeg to convert the stitched webm file to mp4
    await execAsync(`ffmpeg -i "${stitchedFilePath}" -y "${finalMp4Path}"`);
    
    const endTime = Date.now();
    console.log(`[CONVERT-WORKER] Conversion complete: ${finalMp4Path}. Took ${endTime - startTime}ms.`);

    // Log output file details
    const outputStats = fs.statSync(finalMp4Path);
    console.log(`[CONVERT-WORKER] Output file details: {`);
    console.log(`  size: ${outputStats.size},`);
    console.log(`  sizeInMB: '${(outputStats.size / 1024 / 1024).toFixed(2)}',`);
    console.log(`  path: '${finalMp4Path}',`);
    console.log(`  exists: ${fs.existsSync(finalMp4Path)}`);
    console.log(`}`);

    // 2. Upload directly to R2
    if (!R2_ENABLED || !s3Client) {
      throw new Error("R2 storage is not configured on the worker.");
    }

    const mp4Buffer = fs.readFileSync(finalMp4Path);
    console.log(`[CONVERT-WORKER] Read buffer size: ${mp4Buffer.length} bytes (${(mp4Buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    
    // Create a unique filename for the final recording in R2
    const r2FileName = `media/final/${sessionId}/${Date.now()}.mp4`; 
    
    console.log(`[CONVERT-WORKER] Uploading ${finalMp4Path} to R2 as ${r2FileName}...`);

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2FileName,
        Body: mp4Buffer,
        ContentType: "video/mp4",
        Metadata: {
            sessionId: sessionId || "unknown",
            userId: userId || "unknown",
            fileType: "AUDIO_VIDEO_FINAL",
        }
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2FileName}`;
    console.log(`[CONVERT-WORKER] File uploaded to R2. Public URL: ${publicUrl}`);
    console.log(`[CONVERT-WORKER] Uploaded file size: ${(mp4Buffer.length / 1024 / 1024).toFixed(2)}MB`);

    // 3. Save final metadata to the database
    // Ensure Participation Record Exists for MediaFile
    let actualParticipantId = null;
    
    if (userId) {
      // Check if a participation record exists for this user in this session
      const existingParticipation = await prisma.participation.findFirst({
        where: {
          sessionId,
          userId: userId,
        },
      });

      if (!existingParticipation) {
        // Create a participation record for this user in this session
        console.log(`[CONVERT-WORKER] Creating participation record for user ${userId} in session ${sessionId}`);
        
        const newParticipation = await prisma.participation.create({
          data: {
            userId: userId,
            sessionId,
            role: "HOST", // Default to HOST role for now
          },
        });
        
        actualParticipantId = newParticipation.id;
        console.log(`[CONVERT-WORKER] Created participation record with ID: ${actualParticipantId}`);
      } else {
        actualParticipantId = existingParticipation.id;
        console.log(`[CONVERT-WORKER] Found existing participation record with ID: ${actualParticipantId}`);
      }
    }

    await prisma.mediaFile.create({
      data: {
        sessionId,
        participantId: actualParticipantId,
        url: publicUrl,
        type: "AUDIO_VIDEO_FINAL",
        status: "COMPLETE",
        s3Key: r2FileName,
        isFinal: true,
        uploadedAt: new Date(),
      },
    });
    console.log(`[CONVERT-WORKER] Database updated with final media file metadata.`);
    
  } catch (err) {
    console.error(`[CONVERT-WORKER] Job ${job.id} failed:`, err);
    
    // If conversion or upload fails, clean up the final mp4 if it was created
    if (fs.existsSync(finalMp4Path)) {
      fs.unlinkSync(finalMp4Path);
    }
    throw err; // Re-throw the error to mark the job as failed
  } finally {
    // Clean up both the original stitched .webm file and the final .mp4 file
    if (fs.existsSync(stitchedFilePath)) {
      fs.unlinkSync(stitchedFilePath);
      console.log(`[CONVERT-WORKER] Cleaned up intermediate stitched file: ${stitchedFilePath}`);
    }
    if (fs.existsSync(finalMp4Path)) {
      fs.unlinkSync(finalMp4Path);
      console.log(`[CONVERT-WORKER] Cleaned up temporary file: ${finalMp4Path}`);
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
