// Example path: /api/sessions/upload-chunk

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma"; // Your Prisma client
import { stitchingQueue } from "@/lib/queues/stitchingQueue"; // Your stitching queue
import B2 from "backblaze-b2";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit per chunk

// Initialize the B2 client with credentials from your environment variables
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId")?.toString();
    const participantId = formData.get("participantId")?.toString(); // Use participantId for better context
    const chunkIndex = parseInt(formData.get("chunkIndex")?.toString() || "0", 10);
    const isFinal = formData.get("isFinal")?.toString() === "true";

    // --- Validation ---
    if (!file || !sessionId || !participantId || formData.get("chunkIndex") === null) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, participantId, chunkIndex, and file" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // --- B2 Upload Logic ---
    const buffer = Buffer.from(await file.arrayBuffer());
    // Define a unique path and name for the chunk in B2
    const b2FileName = `chunks/${sessionId}/${participantId}_${chunkIndex}.webm`;

    console.log(`[B2-UPLOAD] Attempting to upload chunk ${chunkIndex} for session ${sessionId}...`);

    // 1. Authorize with B2 to get a session token
    await b2.authorize();

    // 2. Get a temporary upload URL from B2
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });

    // 3. Upload the file chunk to B2
    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: b2FileName,
      data: buffer,
      mime: file.type || "video/webm",
    });

    console.log(`[B2-UPLOAD] Chunk ${chunkIndex} successfully uploaded to B2 as ${b2FileName}`);

    // 4. Save metadata for the uploaded chunk to your database
    await prisma.recordingChunk.create({
      data: {
        sessionId,
        participantId,
        chunkIndex,
        storagePath: b2FileName, // Store the B2 file name/key
      },
    });

    // --- Job Creation on Final Chunk ---
    if (isFinal) {
      console.log(`[B2-UPLOAD] Final chunk for ${sessionId} received. Adding job to stitching queue.`);
      
      // The job only needs the sessionId. The worker will fetch chunk details from the DB.
      await stitchingQueue.add("stitch-session-files", {
        sessionId,
        userId: formData.get("userId")?.toString(), // Pass userId if needed downstream
      });

      return NextResponse.json(
        { success: true, message: "Recording complete, processing started." },
        { status: 202 } // 202 Accepted
      );
    }

    // If it's not the final chunk, just acknowledge receipt
    return NextResponse.json(
      { success: true, message: `Chunk ${chunkIndex} received and uploaded.` },
      { status: 200 }
    );

  } catch (error) {
    console.error("[B2-UPLOAD] An unexpected error occurred:", error);
    return NextResponse.json({ error: "Upload failed due to a server error." }, { status: 500 });
  }
}
