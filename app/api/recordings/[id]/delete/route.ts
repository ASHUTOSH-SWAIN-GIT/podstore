import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/utils/prisma";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!BUCKET) {
    console.error("FATAL: R2_BUCKET environment variable is not set.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { id } = await params;
  
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await cookieStore).get(name)?.value,
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the session and verify user has access (only host can delete)
    const session = await prisma.session.findFirst({
      where: {
        id,
        hostId: user.id, // Only host can delete recordings
      },
      include: {
        mediaFiles: {
          where: {
            s3Key: { not: null },
          },
          select: {
            id: true,
            s3Key: true,
          },
        },
        chunks: {
          select: {
            id: true,
            storagePath: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ 
        error: "Recording not found or you don't have permission to delete it" 
      }, { status: 404 });
    }

    // Delete all media files and chunks from R2 bucket
    const deletePromises = [
      // Delete final media files
      ...session.mediaFiles.map(async (mediaFile) => {
        if (mediaFile.s3Key) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET,
              Key: mediaFile.s3Key,
            });
            await s3.send(deleteCommand);
            console.log(`Deleted media file from R2: ${mediaFile.s3Key}`);
          } catch (s3Error) {
            console.error(`Failed to delete media file from R2: ${mediaFile.s3Key}`, s3Error);
          }
        }
      }),
      // Delete recording chunks
      ...session.chunks.map(async (chunk) => {
        if (chunk.storagePath) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET,
              Key: chunk.storagePath,
            });
            await s3.send(deleteCommand);
            console.log(`Deleted chunk from R2: ${chunk.storagePath}`);
          } catch (s3Error) {
            console.error(`Failed to delete chunk from R2: ${chunk.storagePath}`, s3Error);
          }
        }
      }),
    ];

    // Wait for all S3 deletions to complete (or fail)
    await Promise.allSettled(deletePromises);

    // Delete from database using a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all recording chunks
      await tx.recordingChunk.deleteMany({
        where: { sessionId: id },
      });

      // Delete all processing jobs
      await tx.processingJob.deleteMany({
        where: { sessionId: id },
      });

      // Delete all media files
      await tx.mediaFile.deleteMany({
        where: { sessionId: id },
      });

      // Delete all participants
      await tx.participation.deleteMany({
        where: { sessionId: id },
      });

      // Delete the session
      await tx.session.delete({
        where: { id },
      });
    });

    console.log(`Successfully deleted session ${id} and all associated data`);

    return NextResponse.json({ 
      message: "Recording and all associated data deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json({ 
      error: "Failed to delete recording. Please try again." 
    }, { status: 500 });
  }
}
