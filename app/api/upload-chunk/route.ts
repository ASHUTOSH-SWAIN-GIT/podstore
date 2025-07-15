import { NextRequest, NextResponse } from "next/server";
import { mediaQueue } from "@/lib/queues/mediaQueue";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  console.log(`[UPLOAD-CHUNK] Request started at: ${new Date().toISOString()}`);
  
  try {
    // Parse form data with streaming for better performance
    const formDataStartTime = performance.now();
    const formData = await req.formData();
    const formDataDuration = performance.now() - formDataStartTime;
    console.log(`[UPLOAD-CHUNK] FormData parsed in: ${formDataDuration.toFixed(2)}ms`);

    const file = formData.get("file") as File;
    const userId = formData.get("userId")?.toString();
    const sessionId = formData.get("sessionId")?.toString();
    const type = formData.get("type")?.toString() || "AUDIO_VIDEO";

    // Quick validation without extra logging overhead
    if (!file || !sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fast file size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Optimized buffer conversion using streaming
    const bufferStartTime = performance.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const bufferDuration = performance.now() - bufferStartTime;
    
    console.log(`[UPLOAD-CHUNK] Buffer created - Size: ${file.size} bytes, Time: ${bufferDuration.toFixed(2)}ms`);

    // Add job to queue with priority for faster processing
    const queueStartTime = performance.now();
    const job = await mediaQueue.add("convert-and-upload", {
      fileBuffer: Array.from(buffer), // Convert Uint8Array to regular array for JSON serialization
      sessionId,
      userId,
      type,
    }, {
      // Optimize job options for performance
      priority: 10, // Higher priority for media chunks
      delay: 0,     // Process immediately
      removeOnComplete: true,
      attempts: 2,  // Reduce attempts for faster failure handling
    });
    
    const queueDuration = performance.now() - queueStartTime;
    console.log(`[UPLOAD-CHUNK] Job ${job.id} queued in: ${queueDuration.toFixed(2)}ms`);

    const totalDuration = performance.now() - startTime;
    console.log(`[UPLOAD-CHUNK] Total duration: ${totalDuration.toFixed(2)}ms`);
    
    return NextResponse.json(
      { success: true, jobId: job.id },
      { status: 202 }
    );

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[UPLOAD-CHUNK] Failed after ${duration.toFixed(2)}ms:`, error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}