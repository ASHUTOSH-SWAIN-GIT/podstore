import { NextRequest, NextResponse } from "next/server";
import { mediaQueue } from "@/lib/queues/mediaQueue";


const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

export async function POST(req: NextRequest) {
  let b2FileName: string | null = null;
  
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId")?.toString();
    const sessionId = formData.get("sessionId")?.toString();
    const type = formData.get("type")?.toString() || "AUDIO_VIDEO";

    if (!file || !sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Validate file type
    if (!file.type.includes('webm') && !file.name.endsWith('.webm')) {
      return NextResponse.json(
        { error: "Only WebM files are supported" },
        { status: 415 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Add job to processing queue, passing the buffer
    await mediaQueue.add("convert-and-upload", {
      fileBuffer: buffer,
      sessionId,
      userId,
      type,
    },{
      removeOnComplete:true,
      attempts: 3
    });

    return NextResponse.json(
      { success: true, message: "File chunk sent to queue for processing." },
      { status: 202 }
    );

  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json({ error: "Failed to upload file to B2 or queue job" }, { status: 500 });
  }
}