import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { hostId, title, id } = await req.json();

    if (!hostId || !title || !id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const user = await prisma.user.upsert({
      where: { id: hostId },
      update: {},
      create: {
        id: hostId,

        name: hostId,
      },
    });

    const joinToken = nanoid(10);

    const session = await prisma.session.create({
      data: {
        id,
        hostId: user.id,
        title,
        joinToken,
      },
    });

    return NextResponse.json(
      {
        session,
        joinUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/join/${joinToken}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            leftAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        mediaFiles: {
          select: {
            id: true,
            type: true,
            isFinal: true,
            status: true,
            url: true,
            duration: true,
            uploadedAt: true,
          },
        },
      },
    });

    return NextResponse.json(sessions, { status: 200 });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
