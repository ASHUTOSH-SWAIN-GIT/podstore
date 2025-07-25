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

    // 4. Check for duplicate chunks before saving
    const existingChunk = await prisma.recordingChunk.findFirst({
      where: {
        sessionId,
        participantId: actualParticipantId,
        chunkIndex,
      },
    });
    
    if (existingChunk) {
      console.log(`[B2-UPLOAD] Chunk ${chunkIndex} already exists for session ${sessionId}, skipping database save`);
      // Don't create duplicate, but continue with the flow
    } else {
      // Save metadata for the uploaded chunk to your database with error handling
      let chunkSaved = false;
      let saveAttempts = 0;
      const maxSaveAttempts = 3;
      
      while (!chunkSaved && saveAttempts < maxSaveAttempts) {
        try {
          await prisma.recordingChunk.create({
            data: {
              sessionId,
              participantId: actualParticipantId,
              chunkIndex,
              storagePath: b2FileName,
            },
          });
          chunkSaved = true;
          console.log(`[B2-UPLOAD] Chunk ${chunkIndex} metadata saved to database`);
        } catch (dbError) {
          saveAttempts++;
          console.error(`[B2-UPLOAD] Failed to save chunk ${chunkIndex} metadata (attempt ${saveAttempts}/${maxSaveAttempts}):`, dbError);
          
          if (saveAttempts >= maxSaveAttempts) {
            console.error(`[B2-UPLOAD] CRITICAL: Failed to save chunk ${chunkIndex} metadata after ${maxSaveAttempts} attempts`);
            return NextResponse.json({ 
              error: `Failed to save chunk ${chunkIndex} metadata to database` 
            }, { status: 500 });
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * saveAttempts));
        }
      }
    }

    // --- Job Creation on Final Chunk ---
    if (isFinal) {
      console.log(`[B2-UPLOAD] Final chunk for ${sessionId} received. Verifying all chunks before triggering processing...`);
      
      // Wait for concurrent uploads to complete and verify all chunks
      let allChunks;
      let attempt = 0;
      const maxAttempts = 15; // Increased to handle longer race conditions
      const delayMs = 1500; // Slightly reduced for more frequent checks
      let expectedChunkCount = 0;
      let currentIndexes = [];
      
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
        currentIndexes = allChunks.map(c => c.chunkIndex).sort((a, b) => a - b);
        console.log(`[B2-UPLOAD] Current chunks: [${currentIndexes.join(', ')}]`);
        
        // Determine the expected chunk range dynamically
        const minChunkIndex = currentIndexes.length > 0 ? Math.min(...currentIndexes) : 1;
        const maxChunkIndex = chunkIndex; // Final chunk index
        expectedChunkCount = maxChunkIndex - minChunkIndex + 1;
        
        console.log(`[B2-UPLOAD] Expected chunk range: ${minChunkIndex} to ${maxChunkIndex} (${expectedChunkCount} chunks)`);
        
        // Check if we have a complete sequence from minChunkIndex to chunkIndex (final chunk)
        const hasCompleteSequence = currentIndexes.length === expectedChunkCount &&
          currentIndexes[0] === minChunkIndex && 
          currentIndexes[currentIndexes.length - 1] === chunkIndex;
        
        if (hasCompleteSequence) {
          console.log(`[B2-UPLOAD] Complete sequence detected: ${minChunkIndex} to ${chunkIndex}`);
          break;
        }
        
        // Check for missing chunks in the expected sequence
        const missingChunks = [];
        for (let i = minChunkIndex; i <= chunkIndex; i++) {
          if (!currentIndexes.includes(i)) {
            missingChunks.push(i);
          }
        }
        
        if (missingChunks.length > 0) {
          console.log(`[B2-UPLOAD] Missing chunks: [${missingChunks.join(', ')}] - will retry`);
        }
        
        attempt++;
        
        // Continue if we don't have the expected chunk count or sequence is incomplete
      } while (allChunks.length < expectedChunkCount && attempt < maxAttempts);
      
      // Final safety check - get the latest chunks one more time
      console.log(`[B2-UPLOAD] Performing final chunk verification...`);
      allChunks = await prisma.recordingChunk.findMany({
        where: { sessionId },
        orderBy: { chunkIndex: 'asc' },
      });
      
      console.log(`[B2-UPLOAD] Final verification: Found ${allChunks.length} chunks for session ${sessionId}:`);
      allChunks.forEach((chunk) => {
        console.log(`  - Chunk ${chunk.chunkIndex}: ${chunk.storagePath}`);
      });
      
      // Verify chunk sequence integrity with improved logic
      const chunkIndexes = allChunks.map(c => c.chunkIndex).sort((a, b) => a - b);
      const missingChunks = [];
      const duplicateChunks = [];
      
      // Determine the actual chunk range from the data
      const minChunkIndex = chunkIndexes.length > 0 ? chunkIndexes[0] : 1;
      const maxChunkIndex = chunkIndex; // Final chunk index
      
      console.log(`[B2-UPLOAD] Verifying chunk sequence from ${minChunkIndex} to ${maxChunkIndex}`);
      
      // Check for complete sequence from minChunkIndex to final chunk index
      for (let i = minChunkIndex; i <= maxChunkIndex; i++) {
        const chunksWithIndex = allChunks.filter(c => c.chunkIndex === i);
        if (chunksWithIndex.length === 0) {
          missingChunks.push(i);
        } else if (chunksWithIndex.length > 1) {
          duplicateChunks.push(i);
        }
      }
      
      // Report any issues
      if (missingChunks.length > 0) {
        console.error(`[B2-UPLOAD] CRITICAL: Missing chunks [${missingChunks.join(', ')}] for session ${sessionId}`);
        console.error(`[B2-UPLOAD] Expected chunks ${minChunkIndex} to ${maxChunkIndex}, but found: [${chunkIndexes.join(', ')}]`);
        
        // Return error for missing chunks instead of proceeding
        return NextResponse.json({
          error: `Missing chunks: ${missingChunks.join(', ')}. Cannot process incomplete recording.`,
          missingChunks,
          foundChunks: chunkIndexes,
          expectedRange: `${minChunkIndex}-${maxChunkIndex}`
        }, { status: 422 }); // 422 Unprocessable Entity
      }
      
      if (duplicateChunks.length > 0) {
        console.warn(`[B2-UPLOAD] WARNING: Duplicate chunks [${duplicateChunks.join(', ')}] for session ${sessionId}`);
        // We can proceed with duplicates, just log the warning
      }
      
      console.log(`[B2-UPLOAD] ✅ All chunks verified. Complete sequence from ${minChunkIndex} to ${maxChunkIndex}.`);
      
      console.log(`[B2-UPLOAD] All chunks verified. Job will be processed when session ends.`);
      
      // Note: Workers will be started automatically when the session is ended via /api/sessions/[id]/end
      // This ensures processing only begins after all participants have finished uploading

      return NextResponse.json(
        { 
          success: true, 
          message: `Recording complete with ${allChunks.length} chunks. Processing will start when session ends.`,
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