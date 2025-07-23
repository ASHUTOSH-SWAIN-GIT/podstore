import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/utils/prisma";
import { getDownloadUrl, isCDNConfigured } from "@/lib/cdn-config";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;

export async function GET(
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
    // Find the session and verify user has access
    const session = await prisma.session.findFirst({
      where: {
        id,
        OR: [
          { hostId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      },
      select: {
        id: true,
        title: true,
        mediaFiles: {
          where: {
            isFinal: true,
            s3Key: { not: null },
          },
          select: {
            s3Key: true,
          },
        },
      },
    });

    if (!session || session.mediaFiles.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const mediaFile = session.mediaFiles[0];
    if (!mediaFile.s3Key) {
      return NextResponse.json({ error: "Recording file not available" }, { status: 404 });
    }

    try {
      // Determine file extension and filename first
      const fileExtension = mediaFile.s3Key.split('.').pop()?.toLowerCase() || 'webm';
      const fileName = `recording-${session.title ? session.title.replace(/[^a-zA-Z0-9-_]/g, '-') : id}.${fileExtension}`;

      // If CDN is configured, redirect to CDN download URL for maximum speed
      if (isCDNConfigured()) {
        const cdnDownloadUrl = getDownloadUrl(mediaFile.s3Key, fileName);
        
        // For CDN, we can redirect directly for fastest download
        return NextResponse.redirect(cdnDownloadUrl, 302);
      }

      // Fallback: Stream through our server (slower but works without CDN)
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: mediaFile.s3Key,
      });
      
      const response = await s3.send(command);
      
      if (!response.Body) {
        return NextResponse.json({ error: "File content not available" }, { status: 404 });
      }

      // Convert the stream to a buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Determine MIME type
      const mimeType = getMimeType(fileExtension);

      // Return the file as a download
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-cache',
        },
      });

    } catch (s3Error) {
      console.error(`Failed to download file from S3: ${mediaFile.s3Key}`, s3Error);
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

  } catch (error) {
    console.error("Error downloading recording:", error);
    return NextResponse.json({ error: "Failed to download recording" }, { status: 500 });
  }
}

function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    'webm': 'video/webm',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}
