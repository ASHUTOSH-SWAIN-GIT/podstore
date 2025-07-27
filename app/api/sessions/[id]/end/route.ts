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

    console.log(`[SESSION-END] User ${userId} is ${isHost ? 'HOST' : 'PARTICIPANT'}`);

    // Only allow ending if session is currently LIVE or SCHEDULED
    if (session.status === "ENDED" || session.status === "PROCESSING" || session.status === "COMPLETE") {
      return NextResponse.json(
        { error: `Session is already ${session.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // If a participant is leaving (not the host), just remove them from the session
    if (!isHost) {
      console.log(`[SESSION-END] Participant ${userId} leaving session ${sessionId}`);
      
      // Update participant's leftAt timestamp instead of deleting
      await prisma.participation.updateMany({
        where: { 
          sessionId,
          userId,
          leftAt: null // Only update if they haven't left already
        },
        data: {
          leftAt: new Date()
        }
      });

      // Count remaining active participants
      const remainingParticipants = await prisma.participation.count({
        where: { 
          sessionId,
          leftAt: null // Only count participants who haven't left
        }
      });

      console.log(`[SESSION-END] Participant left. ${remainingParticipants} participants remaining.`);

      return NextResponse.json({
        success: true,
        message: "Left session successfully.",
        isHost: false,
        remainingParticipants,
        sessionStatus: session.status
      }, { status: 200 });
    }

    // HOST is ending the session - proceed with full session termination
    console.log(`[SESSION-END] HOST ${userId} is ending session ${sessionId}`);

    // Update session status to ENDED
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endTime: new Date(),
      },
    });

    console.log(`[SESSION-END] Session ${sessionId} status updated to ENDED by HOST`);

    // Check if there are any recording chunks for this session
    const recordingChunks = await prisma.recordingChunk.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: 'asc' },
    });

    if (recordingChunks.length > 0) {
      console.log(`[SESSION-END] HOST ended session with ${recordingChunks.length} recording chunks. Starting processing...`);
      
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

      console.log(`[SESSION-END] Job added to stitching queue. Starting workers (HOST action only)...`);
      
      // Automatically start workers if they're not running (ONLY for host-ended sessions)
      try {
        const workersStarted = await workerManager.ensureWorkersRunning();
        if (workersStarted) {
          console.log(`[SESSION-END] ✅ Workers started by HOST and ready to process jobs`);
        } else {
          console.warn(`[SESSION-END] ⚠️ Some workers failed to start, but job is queued`);
        }
      } catch (workerError) {
        console.error(`[SESSION-END] Worker management error:`, workerError);
        // Don't fail the session end because of worker management issues
      }

      return NextResponse.json({
        success: true,
        message: `Session ended by HOST. Processing ${recordingChunks.length} chunks.`,
        session: updatedSession,
        processing: true,
        isHost: true,
        totalChunks: recordingChunks.length,
        workersStatus: workerManager.getWorkersStatus()
      }, { status: 200 });
    } else {
      console.log(`[SESSION-END] HOST ended session with no recording chunks.`);
      
      return NextResponse.json({
        success: true,
        message: "Session ended successfully by HOST.",
        session: updatedSession,
        processing: false,
        isHost: true,
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
