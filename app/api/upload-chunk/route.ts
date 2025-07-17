import { NextRequest, NextResponse } from "next/server";
import { mediaQueue } from "@/lib/queues/mediaQueue";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit per chunk
const TEMP_DIR = "/tmp/recordings"; // Directory to store stitched files

// Ensure the temporary directory exists when the server starts
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId")?.toString();
    const userId = formData.get("userId")?.toString();
    const isFinal = formData.get("isFinal")?.toString(); // Check for the final chunk flag

    // --- Validation ---
    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId and file" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // --- Stitching Logic ---
    const tempFilePath = path.join(TEMP_DIR, `${sessionId}.webm`);
    const buffer = Buffer.from(await file.arrayBuffer());

    // Append the received chunk's data to the temporary file
    fs.appendFileSync(tempFilePath, buffer);
    console.log(`[UPLOAD-CHUNK] Appended chunk to ${tempFilePath}. Size: ${buffer.length}`);

    // --- Job Creation on Final Chunk ---
    if (isFinal === "true") {
      console.log(`[UPLOAD-CHUNK] Final chunk for ${sessionId} received. Adding job to queue.`);
      
      try {
        const job = await mediaQueue.add("convert-file", {
          filePath: tempFilePath, // Pass the path to the COMPLETE stitched file
          sessionId,
          userId,
          type: formData.get("type")?.toString() || "AUDIO_VIDEO",
        }, {
          removeOnComplete: true,
          removeOnFail: true,
        });

        console.log(`[UPLOAD-CHUNK] Job ${job.id} queued for conversion.`);
        return NextResponse.json(
          { success: true, jobId: job.id, message: "Recording complete, processing started." },
          { status: 202 } // 202 Accepted: The request has been accepted for processing
        );
      } catch (queueError) {
        console.error("[UPLOAD-CHUNK] Failed to add final job to queue:", queueError);
        return NextResponse.json({ error: "Failed to queue the final processing job." }, { status: 500 });
      }
    }

    // If it's not the final chunk, just acknowledge receipt
    return NextResponse.json(
      { success: true, message: "Chunk received" },
      { status: 200 }
    );

  } catch (error) {
    console.error("[UPLOAD-CHUNK] An unexpected error occurred:", error);
    return NextResponse.json({ error: "Upload failed due to a server error." }, { status: 500 });
  }
}