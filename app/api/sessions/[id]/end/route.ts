// app/api/sessions/[id]/end/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma";
import { stitchingQueue } from "@/lib/queues/stitchingQueue";
import { workerManager } from "@/lib/utils/worker-manager";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { userId } = body;

    console.log(`[SESSION-END] Ending session ${sessionId} for user ${userId}`);

    // Verify the session exists and the user has permission to end it
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
        host: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is the host or a participant
    const isHost = session.hostId === userId;
    const isParticipant = session.participants.some(p => p.userId === userId);

    if (!isHost && !isParticipant) {
      return NextResponse.json(
        { error: "You don't have permission to end this session" },
        { status: 403 }
      );
    }

    // Only allow ending if session is currently LIVE or SCHEDULED
    if (session.status === "ENDED" || session.status === "PROCESSING" || session.status === "COMPLETE") {
      return NextResponse.json(
        { error: `Session is already ${session.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update session status to ENDED
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endTime: new Date(),
      },
    });

    console.log(`[SESSION-END] Session ${sessionId} status updated to ENDED`);

    // Check if there are any recording chunks for this session
    const recordingChunks = await prisma.recordingChunk.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: 'asc' },
    });

    if (recordingChunks.length > 0) {
      console.log(`[SESSION-END] Found ${recordingChunks.length} recording chunks. Starting processing...`);
      
      // Update session status to PROCESSING
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "PROCESSING" },
      });

      // Add job to stitching queue
      await stitchingQueue.add("stitch-session-files", {
        sessionId,
        userId: userId,
        totalChunks: recordingChunks.length,
      });

      console.log(`[SESSION-END] Job added to stitching queue. Ensuring workers are running...`);
      
      // Automatically start workers if they're not running
      try {
        const workersStarted = await workerManager.ensureWorkersRunning();
        if (workersStarted) {
          console.log(`[SESSION-END] ✅ Workers are running and ready to process jobs`);
        } else {
          console.warn(`[SESSION-END] ⚠️ Some workers failed to start, but job is queued`);
        }
      } catch (workerError) {
        console.error(`[SESSION-END] Worker management error:`, workerError);
        // Don't fail the session end because of worker management issues
      }

      return NextResponse.json({
        success: true,
        message: `Session ended. Processing ${recordingChunks.length} chunks.`,
        session: updatedSession,
        processing: true,
        totalChunks: recordingChunks.length,
        workersStatus: workerManager.getWorkersStatus()
      }, { status: 200 });
    } else {
      console.log(`[SESSION-END] No recording chunks found. Session ended without processing.`);
      
      return NextResponse.json({
        success: true,
        message: "Session ended successfully.",
        session: updatedSession,
        processing: false,
        totalChunks: 0
      }, { status: 200 });
    }

  } catch (error) {
    console.error("[SESSION-END] Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
