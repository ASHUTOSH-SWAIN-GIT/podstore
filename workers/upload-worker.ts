// lib/workers/uploadWorker.ts

import "dotenv/config";
import { Worker } from "bullmq";
import fs from "fs";
import { prisma } from "../lib/utils/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

// --- R2/S3 Client Initialization ---
const R2_ENABLED = 
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME;

let s3Client: S3Client | null = null;
if (R2_ENABLED) {
  let endpointUrl = process.env.R2_ENDPOINT!;
  if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
    endpointUrl = `https://${endpointUrl}`;
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint: endpointUrl,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  console.log("✅ Upload worker initialized with Cloudflare R2 support");
} else {
  console.warn("⚠️ Upload worker initialized WITHOUT R2 support - missing R2 environment variables");
}

console.log("🚀 Starting Upload Worker...");

// This worker listens to the "upload-processing" queue
const worker = new Worker("upload-file", async (job) => {
  // This worker now handles jobs from the conversion worker
  if (job.name !== "upload-file") { 
    console.log(`[UPLOAD-WORKER] Skipping job with incorrect name: ${job.name}`);
    return;
  }

  const { mp4Path, sessionId, userId, type } = job.data;
  console.log(`[UPLOAD-WORKER] Processing job ${job.id} for file: ${mp4Path}`);
  
  if (!mp4Path || !fs.existsSync(mp4Path)) {
      throw new Error(`MP4 file not found at path: ${mp4Path}`);
  }

  try {
    if (!R2_ENABLED || !s3Client) {
      throw new Error("R2 storage is not configured on the worker.");
    }
    
    // --- R2 Upload Process ---
    const mp4Buffer = fs.readFileSync(mp4Path);
    // Create a unique filename for the final recording in R2
    const r2FileName = `media/final/${sessionId}/${Date.now()}.mp4`; 
    
    console.log(`[UPLOAD-WORKER] Uploading ${mp4Path} to R2 as ${r2FileName}...`);

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2FileName,
        Body: mp4Buffer,
        ContentType: "video/mp4",
        Metadata: {
            sessionId: sessionId || "unknown",
            userId: userId || "unknown",
            fileType: type || "AUDIO_VIDEO_FINAL",
        }
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2FileName}`;
    console.log(`[UPLOAD-WORKER] File uploaded to R2. Public URL: ${publicUrl}`);
    console.log(`[UPLOAD-WORKER] Uploaded file size: ${(mp4Buffer.length / 1024 / 1024).toFixed(2)}MB`);

    // --- Save final metadata to the database ---
    
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
        console.log(`[UPLOAD-WORKER] Creating participation record for user ${userId} in session ${sessionId}`);
        
        const newParticipation = await prisma.participation.create({
          data: {
            userId: userId,
            sessionId,
            role: "HOST", // Default to HOST role for now
          },
        });
        
        actualParticipantId = newParticipation.id;
        console.log(`[UPLOAD-WORKER] Created participation record with ID: ${actualParticipantId}`);
      } else {
        actualParticipantId = existingParticipation.id;
        console.log(`[UPLOAD-WORKER] Found existing participation record with ID: ${actualParticipantId}`);
      }
    }

    await prisma.mediaFile.create({
      data: {
        sessionId,
        participantId: actualParticipantId, // Use the actual participation ID or null
        url: publicUrl,
        type: "AUDIO_VIDEO_FINAL",
        status: "COMPLETE",
        s3Key: r2FileName,
        isFinal: true, // Mark this as the final, definitive recording
        uploadedAt: new Date(),
      },
    });
    console.log(`[UPLOAD-WORKER] Database updated with final media file metadata.`);
    
  } catch (err) {
    console.error(`[UPLOAD-WORKER] Job ${job.id} failed:`, err);
    throw err; // Re-throw the error to mark the job as failed
  } finally {
    // Clean up the temporary MP4 file from the server
    if (fs.existsSync(mp4Path)) {
      fs.unlinkSync(mp4Path);
      console.log(`[UPLOAD-WORKER] Cleaned up temporary file: ${mp4Path}`);
    }
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
  concurrency: 10,
});

worker.on('failed', async (job, err) => {
  console.error(`[UPLOAD-WORKER-FAILED] Job ${job?.id} failed with error: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[UPLOAD-WORKER-SUCCESS] Job ${job.id} completed successfully.`);
});

console.log("✅ Upload worker is ready and listening for jobs on 'upload-processing'.");
