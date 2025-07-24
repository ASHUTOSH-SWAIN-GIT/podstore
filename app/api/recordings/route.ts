import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
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
    // Step 1: Query session table to find all sessions for this user
    const userSessions = await prisma.session.findMany({
      where: {
        OR: [
          { hostId: user.id }, // Sessions where user is the host
          { participants: { some: { userId: user.id } } }, // Sessions where user is a participant
        ],
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        host: {
          select: {
            name: true,
          },
        },
        participants: {
          select: {
            id: true,
          },
        },
      },
    });

    if (userSessions.length === 0) {
      // Headers to disable caching
      const noCacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
      
      return NextResponse.json({ 
        recordings: [],
        debug: {
          userId: user.id,
          userEmail: user.email,
          sessionsFound: 0,
          recordingsReturned: 0
        }
      }, { headers: noCacheHeaders });
    }

    // Step 2: Extract session IDs
    const sessionIds = userSessions.map(session => session.id);

    // Step 3: Query mediaFile table to find recordings for these sessions
    const mediaFiles = await prisma.mediaFile.findMany({
      where: {
        sessionId: { in: sessionIds },
        isFinal: true,
        s3Key: { not: null },
      },
      select: {
        s3Key: true,
        sessionId: true,
      },
    });
    
    if (mediaFiles.length === 0) {
      // Headers to disable caching
      const noCacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
      
      return NextResponse.json({ 
        recordings: [],
        debug: {
          userId: user.id,
          userEmail: user.email,
          sessionsFound: userSessions.length,
          recordingsReturned: 0
        }
      }, { headers: noCacheHeaders });
    }

    // Step 4: Combine session data with media file data
    const finalFiles = mediaFiles.map(file => {
      const session = userSessions.find(s => s.id === file.sessionId);
      return {
        s3Key: file.s3Key,
        sessionId: file.sessionId,
        sessionTitle: session?.title || `Session ${file.sessionId.slice(-8)}`,
        hostName: session?.host?.name || 'Unknown',
        participantCount: session?.participants?.length || 0,
        createdAt: session?.createdAt || new Date(),
      };
    });

    // Step 5: Check S3 for file existence and get metadata
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
          lastModified: data.LastModified,
          createdAt: file.createdAt,
          fileSize: data.ContentLength || 0,
          duration: 0, // You might want to get this from MediaFile model
        };
      } catch (error) {
        console.error(`[Recordings API] Error validating S3 object with key: ${file.s3Key}`, error); 
        return null;
      }
    });

    const recordings = (await Promise.all(recordingsPromises)).filter(Boolean);

    // Headers to disable caching
    const noCacheHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    
    return NextResponse.json({ 
      recordings,
      debug: {
        userId: user.id,
        userEmail: user.email,
        sessionsFound: userSessions.length,
        recordingsReturned: recordings.length
      }
    }, { headers: noCacheHeaders });

  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}
