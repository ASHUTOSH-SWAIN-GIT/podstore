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
  console.log(" Stitching worker initialized with Backblaze B2 support (for downloads)");
} else {
  console.warn(" Stitching worker cannot download chunks - missing B2 credentials");
}

const TEMP_DIR = path.join("/tmp", "stitching-work");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log("🚀 Starting Stitching Worker...");

// This worker listens to the "stitching-processing" queue
const worker = new Worker("stitching-processing", async (job) => {
  const { sessionId, userId, totalChunks } = job.data;
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

  console.log(`[STITCH-WORKER] Found ${chunks.length} chunks for session ${sessionId}:`);
  chunks.forEach((chunk, index) => {
    console.log(`  [${index + 1}] Chunk ${chunk.chunkIndex}: ${chunk.storagePath} (created: ${chunk.createdAt})`);
  });

  // Remove duplicates and ensure proper ordering
  const uniqueChunks = [];
  const seenIndexes = new Set();
  
  for (const chunk of chunks) {
    if (!seenIndexes.has(chunk.chunkIndex)) {
      uniqueChunks.push(chunk);
      seenIndexes.add(chunk.chunkIndex);
    } else {
      console.warn(`[STITCH-WORKER] Skipping duplicate chunk ${chunk.chunkIndex}: ${chunk.storagePath}`);
    }
  }
  
  // Sort by chunk index to ensure proper order
  uniqueChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  console.log(`[STITCH-WORKER] After deduplication: ${uniqueChunks.length} unique chunks:`);
  uniqueChunks.forEach((chunk, index) => {
    console.log(`  [${index + 1}] Chunk ${chunk.chunkIndex}: ${chunk.storagePath}`);
  });

  // Verify chunk sequence integrity
  const chunkIndexes = uniqueChunks.map(c => c.chunkIndex);
  const missingChunks = [];
  const minIndex = Math.min(...chunkIndexes);
  const maxIndex = Math.max(...chunkIndexes);
  
  for (let i = minIndex; i <= maxIndex; i++) {
    if (!chunkIndexes.includes(i)) {
      missingChunks.push(i);
    }
  }

  if (missingChunks.length > 0) {
    console.warn(`[STITCH-WORKER] WARNING: Missing chunks: ${missingChunks.join(', ')}`);
    console.warn(`[STITCH-WORKER] Available chunks: ${chunkIndexes.join(', ')}`);
  }

  // Verify against expected total if provided
  if (totalChunks && uniqueChunks.length !== totalChunks) {
    console.warn(`[STITCH-WORKER] WARNING: Expected ${totalChunks} chunks but found ${uniqueChunks.length} unique chunks`);
  }

  console.log(`[STITCH-WORKER] Proceeding to stitch ${uniqueChunks.length} chunks in order: [${chunkIndexes.join(', ')}]`);

  const jobTempDir = path.join(TEMP_DIR, job.id as string);
  fs.mkdirSync(jobTempDir, { recursive: true });

  const localChunkPaths: string[] = [];
  // The stitched file will be a .webm since we are just copying codecs
  let stitchedFilePath: string | null = null;

  try {
    // 1. Authorize with B2 and download all chunks
    await b2.authorize();
    console.log(`[STITCH-WORKER] Downloading ${uniqueChunks.length} chunks from B2...`);
    for (const chunk of uniqueChunks) {
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
    // Note: We'll create the file list content after validating chunks

    // Debug: Verify each chunk file before stitching
    console.log(`[STITCH-WORKER] Verifying ${localChunkPaths.length} chunk files before stitching:`);
    const validChunkPaths = [];
    
    for (const filePath of localChunkPaths) {
      if (!fs.existsSync(filePath)) {
        console.error(`[STITCH-WORKER] ERROR: Chunk file missing: ${filePath}`);
        continue; // Skip missing files
      }
      
      const stats = fs.statSync(filePath);
      console.log(`[STITCH-WORKER] ${path.basename(filePath)}: ${stats.size} bytes`);
      
      // Check if file is too small (likely corrupted)
      if (stats.size < 100) {
        console.warn(`[STITCH-WORKER] WARNING: ${path.basename(filePath)} is very small (${stats.size} bytes) - skipping corrupted file`);
        continue; // Skip very small files
      }
      
      // Try to read the file to check if it's accessible
      try {
        const buffer = fs.readFileSync(filePath);
        const hex = buffer.slice(0, 20).toString('hex');
        console.log(`[STITCH-WORKER] ${path.basename(filePath)} header: ${hex.substring(0, 16)}...`);
        
        // Add to valid chunks list
        validChunkPaths.push(filePath);
        
      } catch (readError) {
        console.error(`[STITCH-WORKER] ERROR: Cannot read ${path.basename(filePath)}: ${readError.message} - skipping`);
        continue; // Skip unreadable files
      }
    }
    
    console.log(`[STITCH-WORKER] Valid chunks for stitching: ${validChunkPaths.length}/${localChunkPaths.length}`);
    
    if (validChunkPaths.length === 0) {
      throw new Error("No valid chunk files found for stitching");
    }
    
    // Create file list content with only valid chunks
    const fileListContent = validChunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(fileListPath, fileListContent);

    console.log(`[STITCH-WORKER] File list content:\n${fileListContent}`);

    stitchedFilePath = path.join(jobTempDir, `${sessionId}_stitched.webm`);
    console.log(`[STITCH-WORKER] Stitching ${validChunkPaths.length} valid chunks with FFmpeg...`);
    
    // Check if we have WebM fragments that need special handling
    const chunkTypes = await Promise.all(validChunkPaths.map(async (filePath) => {
      const buffer = fs.readFileSync(filePath);
      const headerHex = buffer.slice(0, 4).toString('hex');
      const isCompleteWebM = headerHex.startsWith('1a45dfa3');
      const isWebMFragment = headerHex.startsWith('a3') || headerHex.startsWith('a4');
      return { filePath, isCompleteWebM, isWebMFragment, size: buffer.length };
    }));
    
    const hasFragments = chunkTypes.some(c => c.isWebMFragment);
    const hasCompleteWebM = chunkTypes.some(c => c.isCompleteWebM);
    
    console.log(`[STITCH-WORKER] Chunk analysis:`);
    chunkTypes.forEach((chunk, i) => {
      const type = chunk.isCompleteWebM ? 'COMPLETE' : chunk.isWebMFragment ? 'FRAGMENT' : 'UNKNOWN';
      console.log(`  ${path.basename(chunk.filePath)}: ${type} (${chunk.size} bytes)`);
    });
    
    if (hasFragments && hasCompleteWebM) {
      console.log(`[STITCH-WORKER] Detected WebM fragments - using binary concatenation approach`);
      
      // For WebM fragments, concatenate the raw bytes first
      const concatenatedBuffer = Buffer.concat(
        validChunkPaths.map(filePath => fs.readFileSync(filePath))
      );
      
      const rawConcatPath = path.join(jobTempDir, `${sessionId}_raw_concat.webm`);
      fs.writeFileSync(rawConcatPath, concatenatedBuffer);
      
      console.log(`[STITCH-WORKER] Created raw concatenated file: ${concatenatedBuffer.length} bytes`);
      
      // Now use FFmpeg to remux/fix the concatenated file
      await execAsync(`ffmpeg -i "${rawConcatPath}" -c copy "${stitchedFilePath}"`);
      console.log(`[STITCH-WORKER] Binary concatenation and remux complete: ${stitchedFilePath}`);
      
    } else if (validChunkPaths.length === 1) {
      console.log(`[STITCH-WORKER] Single chunk detected - copying directly`);
      fs.copyFileSync(validChunkPaths[0], stitchedFilePath);
      
    } else {
      console.log(`[STITCH-WORKER] Using filter_complex concat for multiple complete WebM files`);
      
      // Use the filter_complex approach for multiple complete WebM files
      const inputArgs = validChunkPaths.map(p => `-i "${p}"`).join(' ');
      const filterComplex = validChunkPaths.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${validChunkPaths.length}:v=1:a=1[outv][outa]`;
      
      await execAsync(`ffmpeg ${inputArgs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libvpx -c:a libvorbis "${stitchedFilePath}"`);
      console.log(`[STITCH-WORKER] Filter complex stitching complete: ${stitchedFilePath}`);
    }

    // Verify the stitched file was created and get its info
    if (!fs.existsSync(stitchedFilePath)) {
      throw new Error(`Stitched file was not created: ${stitchedFilePath}`);
    }
    
    const stitchedStats = fs.statSync(stitchedFilePath);
    console.log(`[STITCH-WORKER] Stitched file verified: ${stitchedStats.size} bytes (${(stitchedStats.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Small delay to ensure file system sync
    await new Promise(resolve => setTimeout(resolve, 100));

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

console.log(" Stitching worker is ready and listening for jobs on 'stitching-processing'.");
