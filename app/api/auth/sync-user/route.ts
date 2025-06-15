import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: NextRequest) {
  try {
    const { id, email, name, image } = await req.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 },
      );
    }

    // Upsert user in your database
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name: name || email.split("@")[0],
        // Add any other fields you want to update
      },
      create: {
        id,
        email,
        name: name || email.split("@")[0],
        // Add any default values for new users
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Failed to sync user:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
