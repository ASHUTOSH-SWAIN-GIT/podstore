import "dotenv/config";
import { Worker } from "bullmq";
import fs from "fs";
import { prisma } from "../lib/utils/prisma";
import B2 from "backblaze-b2";

// Check if B2 credentials are available
const B2_ENABLED = process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_ID;

let b2: B2 | null = null;
if (B2_ENABLED) {
  b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID!,
    applicationKey: process.env.B2_APPLICATION_KEY!,
  });
  console.log(" Upload worker initialized with B2 support");
} else {
  console.warn(" Upload worker initialized WITHOUT B2 support - missing B2 credentials");
}

console.log("Starting upload worker...");

const worker = new Worker("upload-processing", async (job) => {
  console.log(`[UPLOAD-WORKER] Processing job: ${job.name} (ID: ${job.id})`);

  // NOTE: Your job name in the previous file was "convert-file", but here it's "upload-file".
  // Make sure this matches the name you use when adding jobs to the queue.
  if (job.name !== "upload-file") { 
    console.log(`Skipping job with incorrect name: ${job.name}`);
    return;
  }

  const { mp4Path, sessionId, userId, type, fileId } = job.data;
  
  if (!mp4Path || !fs.existsSync(mp4Path)) {
      throw new Error(`MP4 file not found at path: ${mp4Path}`);
  }

  try {
    console.log(`[UPLOAD-WORKER] Processing file: ${mp4Path}`);
    
    if (!B2_ENABLED || !b2) {
      console.warn(`[UPLOAD-WORKER] B2 not configured, saving file locally instead`);
      
      // Save to database with local path
      await prisma.mediaFile.create({
        data: {
          sessionId,
          url: mp4Path, // Store local path when B2 is not available
          type: type || "AUDIO_VIDEO",
          status: "COMPLETE",
          s3Key: `local/${fileId}.mp4`,
          isFinal: false,
        },
      });
      
      console.log(`[UPLOAD-WORKER] File saved locally: ${mp4Path}`);
      return; // Don't delete the file when storing locally
    }
    
    // --- B2 Upload Process ---
    
    // 1. Authorize with B2 to get a fresh token for this job
    console.log(`[UPLOAD-WORKER] Authorizing with B2...`);
    await b2.authorize();
    console.log(`[UPLOAD-WORKER] B2 Authorization successful.`);

    // 2. Get a temporary upload URL
    console.log(`[UPLOAD-WORKER] Getting B2 upload URL...`);
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    
    const mp4Buffer = fs.readFileSync(mp4Path);
    const b2FileName = `media/${fileId}.mp4`;
    
    // 3. Upload the file
    console.log(`[UPLOAD-WORKER] Uploading ${mp4Path} to B2...`);
    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: b2FileName,
      data: mp4Buffer,
      mime: "video/mp4",
    });

    // 4. Get a temporary download URL for the database
    const signedUrl = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID!,
      fileNamePrefix: b2FileName,
      validDurationInSeconds: 3600 * 24 * 7, // 7-day validity
    });
    
    const downloadUrl = `${process.env.B2_DOWNLOAD_URL}/file/${process.env.B2_BUCKET_NAME}/${b2FileName}?Authorization=${signedUrl.data.authorizationToken}`;
    console.log(`[UPLOAD-WORKER] File uploaded to B2.`);

    // 5. Save metadata to DB
    await prisma.mediaFile.create({
      data: {
        sessionId,
        url: downloadUrl,
        type: type || "AUDIO_VIDEO",
        status: "COMPLETE",
        s3Key: b2FileName,
        isFinal: false,
      },
    });
    console.log(`[UPLOAD-WORKER] Database updated.`);

    // 6. Clean up the temporary file from the server
    fs.unlinkSync(mp4Path);
    console.log(`[UPLOAD-WORKER] Cleaned up temporary file: ${mp4Path}`);
    
  } catch (err) {
    console.error(`[UPLOAD-WORKER] Job ${job.id} failed:`, err);
    // Clean up the file even on failure to prevent filling up the disk
    if (fs.existsSync(mp4Path)) {
        fs.unlinkSync(mp4Path);
    }
    throw err; // Re-throw the error to mark the job as failed in the queue
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
  concurrency: 10,
});

worker.on('failed', async (job, err) => {
  console.error(`[WORKER-EVENT] Job ${job?.id} failed: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[WORKER-EVENT] Job ${job.id} has completed.`);
});

console.log("✅ Upload worker is ready and listening for jobs...");