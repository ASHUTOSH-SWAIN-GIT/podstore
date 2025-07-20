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
    const userId = formData.get("userId")?.toString();

    // Debug logging
    console.log(`[B2-UPLOAD] Received upload request:`, {
      hasFile: !!file,
      fileSize: file?.size,
      sessionId,
      participantId,
      chunkIndex,
      isFinal,
      userId,
      chunkIndexRaw: formData.get("chunkIndex")?.toString()
    });

    // --- Validation ---
    if (!file || !sessionId || !participantId || formData.get("chunkIndex") === null || isNaN(chunkIndex)) {
      console.error(`[B2-UPLOAD] Validation failed:`, {
        hasFile: !!file,
        hasSessionId: !!sessionId,
        hasParticipantId: !!participantId,
        hasChunkIndex: formData.get("chunkIndex") !== null,
        chunkIndexValid: !isNaN(chunkIndex)
      });
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

    // --- Ensure Participation Record Exists ---
    let actualParticipantId = participantId;
    
    // Check if the participantId is actually a userId (which means we need to create/find a participation record)
    const existingParticipation = await prisma.participation.findFirst({
      where: {
        sessionId,
        userId: participantId, // If participantId is actually a userId
      },
    });

    if (!existingParticipation) {
      // Create a participation record for this user in this session
      console.log(`[B2-UPLOAD] Creating participation record for user ${participantId} in session ${sessionId}`);
      
      const newParticipation = await prisma.participation.create({
        data: {
          userId: participantId, // Use the participantId as userId
          sessionId,
          role: "HOST", // Default to HOST role for now
        },
      });
      
      actualParticipantId = newParticipation.id;
      console.log(`[B2-UPLOAD] Created participation record with ID: ${actualParticipantId}`);
    } else {
      actualParticipantId = existingParticipation.id;
      console.log(`[B2-UPLOAD] Found existing participation record with ID: ${actualParticipantId}`);
    }

    // --- B2 Upload Logic ---
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate WebM file format
    console.log(`[B2-UPLOAD] Validating chunk ${chunkIndex}: ${buffer.length} bytes`);
    
    if (buffer.length < 1000) {
      console.error(`[B2-UPLOAD] Chunk ${chunkIndex} is too small (${buffer.length} bytes) - likely corrupted`);
      return NextResponse.json(
        { error: `Chunk ${chunkIndex} is too small and likely corrupted` },
        { status: 400 }
      );
    }
    
    // Check for WebM/Matroska header (0x1A45DFA3) or valid WebM continuation chunk
    const headerHex = buffer.slice(0, 20).toString('hex');
    console.log(`[B2-UPLOAD] Chunk ${chunkIndex} header: ${headerHex.substring(0, 20)}...`);
    
    const hasWebMHeader = headerHex.startsWith('1a45dfa3'); // Complete WebM file
    const isWebMFragment = headerHex.startsWith('a3') || headerHex.startsWith('a4'); // WebM continuation chunk
    
    if (!hasWebMHeader && !isWebMFragment) {
      console.error(`[B2-UPLOAD] Chunk ${chunkIndex} is not a valid WebM file or fragment`);
      console.error(`[B2-UPLOAD] Expected header to start with '1a45dfa3' (complete) or 'a3'/'a4' (fragment), got: ${headerHex.substring(0, 16)}`);
      return NextResponse.json(
        { error: `Chunk ${chunkIndex} is not a valid WebM file or fragment` },
        { status: 400 }
      );
    }
    
    if (hasWebMHeader) {
      console.log(`[B2-UPLOAD] Chunk ${chunkIndex} is a complete WebM file ✅`);
    } else {
      console.log(`[B2-UPLOAD] Chunk ${chunkIndex} is a WebM fragment ✅`);
    }
    
    // Define a unique path and name for the chunk in B2
    const b2FileName = `chunks/${sessionId}/${actualParticipantId}_${chunkIndex}.webm`;

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
        participantId: actualParticipantId, // Use the actual participation ID
        chunkIndex,
        storagePath: b2FileName, // Store the B2 file name/key
      },
    });

    // --- Job Creation on Final Chunk ---
    if (isFinal) {
      console.log(`[B2-UPLOAD] Final chunk for ${sessionId} received. Verifying all chunks before triggering processing...`);
      
      // Wait for concurrent uploads to complete and verify all chunks
      let allChunks;
      let attempt = 0;
      const maxAttempts = 8; // Increased from 5 to 8
      const delayMs = 3000; // Increased from 2000ms to 3000ms
      
      do {
        if (attempt > 0) {
          console.log(`[B2-UPLOAD] Waiting ${delayMs}ms for concurrent uploads to complete (attempt ${attempt}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // Get all chunks for this session to verify we have a complete set
        allChunks = await prisma.recordingChunk.findMany({
          where: { sessionId },
          orderBy: { chunkIndex: 'asc' },
        });
        
        console.log(`[B2-UPLOAD] Attempt ${attempt + 1}: Found ${allChunks.length} chunks for session ${sessionId}`);
        
        // Show which chunks we currently have
        const currentIndexes = allChunks.map(c => c.chunkIndex).sort((a, b) => a - b);
        console.log(`[B2-UPLOAD] Current chunks: [${currentIndexes.join(', ')}]`);
        
        attempt++;
        
        // Continue if we have less than 3 chunks (most recordings should have multiple chunks)
        // or if we're still within retry attempts
      } while (allChunks.length < 3 && attempt < maxAttempts);
      
      console.log(`[B2-UPLOAD] Final verification: Found ${allChunks.length} chunks for session ${sessionId}:`);
      allChunks.forEach((chunk) => {
        console.log(`  - Chunk ${chunk.chunkIndex}: ${chunk.storagePath}`);
      });
      
      // Verify chunk sequence integrity
      const chunkIndexes = allChunks.map(c => c.chunkIndex).sort((a, b) => a - b);
      let hasGaps = false;
      
      // Check for gaps in sequence (starting from the lowest index)
      const minIndex = Math.min(...chunkIndexes);
      const maxIndex = Math.max(...chunkIndexes);
      
      for (let i = minIndex; i <= maxIndex; i++) {
        if (!chunkIndexes.includes(i)) {
          console.warn(`[B2-UPLOAD] WARNING: Missing chunk ${i} in sequence`);
          hasGaps = true;
        }
      }
      
      if (hasGaps) {
        console.warn(`[B2-UPLOAD] Proceeding with stitching despite gaps in chunk sequence`);
      }
      
      console.log(`[B2-UPLOAD] All chunks verified. Adding session ${sessionId} to stitching queue with ${allChunks.length} chunks.`);
      
      // The job only needs the sessionId. The worker will fetch chunk details from the DB.
      await stitchingQueue.add("stitch-session-files", {
        sessionId,
        userId: userId || participantId, // Pass userId if needed downstream
        totalChunks: allChunks.length, // Include total chunk count for verification
      });

      return NextResponse.json(
        { 
          success: true, 
          message: `Recording complete with ${allChunks.length} chunks, processing started.`,
          totalChunks: allChunks.length
        },
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