// lib/workers/stitchingWorker.ts

import "dotenv/config";
import { Worker } from "bullmq";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "../lib/utils/prisma";
import B2 from "backblaze-b2";
// The queue for the next step in your flow: conversion
import { conversionQueue } from "../lib/queues/mediaQueue"; 

const execAsync = promisify(exec);

// --- B2 Client Initialization (for downloading chunks) ---
const B2_ENABLED = 
  process.env.B2_KEY_ID && 
  process.env.B2_APPLICATION_KEY && 
  process.env.B2_BUCKET_ID;

let b2: B2 | null = null;
if (B2_ENABLED) {
  b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID!,
    applicationKey: process.env.B2_APPLICATION_KEY!,
  });
  console.log("✅ Stitching worker initialized with Backblaze B2 support (for downloads)");
} else {
  console.warn("⚠️ Stitching worker cannot download chunks - missing B2 credentials");
}

const TEMP_DIR = path.join("/tmp", "stitching-work");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log("🚀 Starting Stitching Worker...");

// This worker listens to the "stitching-processing" queue
const worker = new Worker("stitching-processing", async (job) => {
  const { sessionId, userId } = job.data;
  console.log(`[STITCH-WORKER] Processing job for session: ${sessionId}`);

  if (!b2) {
    throw new Error("B2 storage is not configured on the worker.");
  }

  const chunks = await prisma.recordingChunk.findMany({
    where: { sessionId },
    orderBy: { chunkIndex: 'asc' },
  });

  if (chunks.length === 0) {
    console.warn(`[STITCH-WORKER] No chunks found for session ${sessionId}. Skipping.`);
    return;
  }

  const jobTempDir = path.join(TEMP_DIR, job.id as string);
  fs.mkdirSync(jobTempDir, { recursive: true });

  const localChunkPaths: string[] = [];
  // The stitched file will be a .webm since we are just copying codecs
  let stitchedFilePath: string | null = null;

  try {
    // 1. Authorize with B2 and download all chunks
    await b2.authorize();
    console.log(`[STITCH-WORKER] Downloading ${chunks.length} chunks from B2...`);
    for (const chunk of chunks) {
      const response = await b2.downloadFileByName({
        bucketName: process.env.B2_BUCKET_NAME!,
        fileName: chunk.storagePath,
        responseType: "arraybuffer"
      });
      const localPath = path.join(jobTempDir, `chunk_${chunk.chunkIndex}.webm`);
      // @ts-ignore
      fs.writeFileSync(localPath, Buffer.from(response.data));
      localChunkPaths.push(localPath);
    }
    console.log(`[STITCH-WORKER] All chunks downloaded.`);

    // 2. Stitch the downloaded chunks using FFmpeg
    const fileListPath = path.join(jobTempDir, "file_list.txt");
    const fileListContent = localChunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(fileListPath, fileListContent);

    stitchedFilePath = path.join(jobTempDir, `${sessionId}_stitched.webm`);
    console.log(`[STITCH-WORKER] Stitching files with FFmpeg...`);
    await execAsync(`ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${stitchedFilePath}"`);
    console.log(`[STITCH-WORKER] Stitching complete: ${stitchedFilePath}`);

    // 3. Hand off the stitched .webm file to the conversion queue
    // The conversion worker will listen for jobs with this name.
    await conversionQueue.add("convert-to-mp4", {
        stitchedFilePath: stitchedFilePath,
        sessionId,
        userId,
    });
    console.log(`[STITCH-WORKER] Handed off ${stitchedFilePath} to the conversion queue (media-processing).`);
    
  } catch (err) {
    console.error(`[STITCH-WORKER] Job ${job.id} failed:`, err);
    // If stitching fails, clean up the intermediate stitched file if it exists
    if (stitchedFilePath && fs.existsSync(stitchedFilePath)) {
        fs.unlinkSync(stitchedFilePath);
    }
    throw err;
  } finally {
    // 4. Clean up the temporary downloaded chunks and the list file.
    // The stitched file is left for the next worker to process.
    if (fs.existsSync(jobTempDir)) {
      localChunkPaths.forEach(p => {
        if(fs.existsSync(p)) fs.unlinkSync(p);
      });
      const listFile = path.join(jobTempDir, "file_list.txt");
      if(fs.existsSync(listFile)) fs.unlinkSync(listFile);
      console.log(`[STITCH-WORKER] Cleaned up temporary chunk files.`);
    }
  }
}, {
  connection: { url: process.env.REDIS_URL! },
  concurrency: 5,
});

worker.on('failed', async (job, err) => {
  console.error(`[WORKER-EVENT] Stitching Job ${job?.id} failed: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[WORKER-EVENT] Stitching Job ${job.id} has completed.`);
});

console.log("✅ Stitching worker is ready and listening for jobs on 'stitching-processing'.");
