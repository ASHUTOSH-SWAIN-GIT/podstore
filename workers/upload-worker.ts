import "dotenv/config";
import { Worker } from "bullmq";
import fs from "fs";
import { prisma } from "../lib/utils/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";



// --- R2/S3 Client Initialization ---
const R2_ENABLED = 
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME;

let s3Client: S3Client | null = null;
if (R2_ENABLED) {
  // --- FIX: Ensure the endpoint is a full, valid URL ---
  let endpointUrl = process.env.R2_ENDPOINT!;
  if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
    endpointUrl = `https://${endpointUrl}`;
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint: endpointUrl, // Use the sanitized, full URL
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    // This forces the SDK to use path-style URLs (e.g., endpoint/bucket/key)
    // instead of virtual-hosted-style URLs (e.g., bucket.endpoint/key), which is required for R2.
    forcePathStyle: true,
  });
  console.log("✅ Upload worker initialized with Cloudflare R2 support");
} else {
  console.warn("⚠️ Upload worker initialized WITHOUT R2 support - missing R2 environment variables");
}

console.log("🚀 Starting upload worker...");

const worker = new Worker("upload-processing", async (job) => {
  console.log(`[UPLOAD-WORKER] Processing job: ${job.name} (ID: ${job.id})`);

  // Ensure the job name matches what you're queuing.
  // This should match the name used in your API route that adds jobs.
  if (job.name !== "stitch-and-convert" && job.name !== "upload-file") { 
    console.log(`Skipping job with incorrect name: ${job.name}`);
    return;
  }

  const { mp4Path, sessionId, userId, type, fileId } = job.data;
  
  if (!mp4Path || !fs.existsSync(mp4Path)) {
      throw new Error(`MP4 file not found at path: ${mp4Path}`);
  }

  try {
    console.log(`[UPLOAD-WORKER] Processing file: ${mp4Path}`);
    
    if (!R2_ENABLED || !s3Client) {
      console.warn(`[UPLOAD-WORKER] R2 not configured, file will not be uploaded.`);
      throw new Error("R2 storage is not configured on the worker.");
    }
    
    // --- R2 Upload Process ---
    const mp4Buffer = fs.readFileSync(mp4Path);
    const r2FileName = `media/${fileId || sessionId}/${Date.now()}.mp4`; // Create a unique filename
    
    console.log(`[UPLOAD-WORKER] Uploading ${mp4Path} to R2 as ${r2FileName}...`);

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2FileName,
        Body: mp4Buffer,
        ContentType: "video/mp4",
        // --- NEW: Attach custom metadata to the R2 object ---
        Metadata: {
            sessionId: sessionId || "unknown",
            userId: userId || "unknown",
            fileType: type || "AUDIO_VIDEO",
        }
    });

    await s3Client.send(command);

    // Construct the public URL. Assumes your bucket is public or connected to a custom domain.
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2FileName}`;
    console.log(`[UPLOAD-WORKER] File uploaded to R2. Public URL: ${publicUrl}`);

    // --- UPDATED: Save metadata, including userId, to the database ---
    await prisma.mediaFile.create({
      data: {
        sessionId,
        url: publicUrl,
        type: type || "AUDIO_VIDEO",
        status: "COMPLETE",
        s3Key: r2FileName, // Store the R2 object key
        isFinal: false,
      },
    });
    console.log(`[UPLOAD-WORKER] Database updated with file metadata.`);

    // Clean up the temporary file from the server
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
    // Assuming your Redis URL is correctly set in the environment
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
