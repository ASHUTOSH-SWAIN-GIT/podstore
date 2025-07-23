import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/utils/prisma";
import { getCDNUrl, isCDNConfigured, getCDNHeaders } from "@/lib/cdn-config";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;

export async function GET(req: NextRequest) {
  if (!BUCKET) {
    console.error("FATAL: R2_BUCKET environment variable is not set.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

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
    const sessionsWithRecordings = await prisma.session.findMany({
      where: {
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
        host: {
          select: {
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const finalFiles = sessionsWithRecordings.flatMap(session =>
      session.mediaFiles.map(file => ({
        s3Key: file.s3Key,
        sessionId: session.id,
        sessionTitle: session.title,
        hostName: session.host.name,
        participantCount: session.participants.length,
        createdAt: session.createdAt,
      }))
    );
    
    if (finalFiles.length === 0) {
      return NextResponse.json({ recordings: [] });
    }

    const recordingsPromises = finalFiles.map(async (file) => {
      if (!file.s3Key) return null;
      try {
        const command = new HeadObjectCommand({
          Bucket: BUCKET,
          Key: file.s3Key, 
        });
        const data = await s3.send(command);

        return {
          id: file.sessionId,
          sessionId: file.sessionId,
          sessionTitle: file.sessionTitle,
          hostName: file.hostName,
          participantCount: file.participantCount,
          key: file.s3Key,
          cdnUrl: isCDNConfigured() ? getCDNUrl(file.s3Key) : null,
          lastModified: data.LastModified,
          createdAt: file.createdAt,
          fileSize: data.ContentLength || 0,
          duration: 0, // You might want to get this from MediaFile model
        };
      } catch (error) {
        console.error(`Could not find S3 object with key: ${file.s3Key}`, error); 
        return null;
      }
    });

    const recordings = (await Promise.all(recordingsPromises)).filter(Boolean);

    // Add CDN headers for caching
    const headers = getCDNHeaders();
    
    return NextResponse.json({ 
      recordings,
      cdnEnabled: isCDNConfigured()
    }, { headers });

  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}