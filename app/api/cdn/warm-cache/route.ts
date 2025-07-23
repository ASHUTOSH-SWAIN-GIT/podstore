import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { warmCDNCache, batchWarmCache, isCDNConfigured } from "@/lib/cdn-config";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: NextRequest) {
  // Check if CDN is enabled
  if (!isCDNConfigured()) {
    return NextResponse.json({ 
      error: "CDN is not configured",
      warmed: 0
    }, { status: 400 });
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
    const body = await req.json();
    const { sessionIds, s3Keys, warmAll } = body;

    let s3KeysToWarm: string[] = [];

    if (warmAll) {
      // Warm all user's recordings
      const sessions = await prisma.session.findMany({
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
        },
      });

      s3KeysToWarm = sessions
        .flatMap(s => s.mediaFiles)
        .map(m => m.s3Key!)
        .filter(Boolean);

    } else if (sessionIds?.length) {
      // Warm specific sessions
      const sessions = await prisma.session.findMany({
        where: {
          id: { in: sessionIds },
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

      s3KeysToWarm = sessions
        .flatMap(s => s.mediaFiles)
        .map(m => m.s3Key!)
        .filter(Boolean);

    } else if (s3Keys?.length) {
      // Warm specific S3 keys
      s3KeysToWarm = s3Keys;
    } else {
      return NextResponse.json({ 
        error: "No recordings specified to warm",
        warmed: 0
      }, { status: 400 });
    }

    if (s3KeysToWarm.length === 0) {
      return NextResponse.json({ 
        message: "No recordings found to warm",
        warmed: 0
      });
    }

    // Warm the cache
    const { success, failed } = await batchWarmCache(s3KeysToWarm);

    return NextResponse.json({
      message: `Cache warming completed`,
      warmed: success,
      failed: failed,
      total: s3KeysToWarm.length,
      cdnEnabled: true,
    });

  } catch (error) {
    console.error("Error warming CDN cache:", error);
    return NextResponse.json({ 
      error: "Failed to warm CDN cache",
      warmed: 0
    }, { status: 500 });
  }
}