import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  try {
    const participants = await prisma.participation.findMany({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true } },
        mediaFiles: true,
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const body = await req.json();
  const { userId, role } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    // Check if participant already exists
    const existingParticipation = await prisma.participation.findFirst({
      where: {
        userId,
        sessionId,
      },
    });

    if (existingParticipation) {
      // Return existing participation instead of creating duplicate
      return NextResponse.json(existingParticipation, { status: 200 });
    }

    const participation = await prisma.participation.create({
      data: {
        userId,
        sessionId,
        role: role || "GUEST",
        joinedAt: new Date(),
      },
    });

    return NextResponse.json(participation, { status: 201 });
  } catch (error) {
    console.error("Error adding participant:", error);
    return NextResponse.json(
      { error: "Failed to add participant" },
      { status: 500 },
    );
  }
}
