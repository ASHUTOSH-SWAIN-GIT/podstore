import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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
      include: {
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
      // Generate a signed URL for viewing (without download headers)
      const viewCommand = new GetObjectCommand({
        Bucket: BUCKET,
        Key: mediaFile.s3Key,
      });
      
      const viewUrl = await getSignedUrl(s3, viewCommand, { 
        expiresIn: 3600 // 1 hour
      });

      return NextResponse.json({ 
        viewUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      });

    } catch (s3Error) {
      console.error(`Failed to generate view URL for: ${mediaFile.s3Key}`, s3Error);
      return NextResponse.json({ error: "Failed to generate view URL" }, { status: 500 });
    }

  } catch (error) {
    console.error("Error generating view URL:", error);
    return NextResponse.json({ error: "Failed to generate view URL" }, { status: 500 });
  }
}
