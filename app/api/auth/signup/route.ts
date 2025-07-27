import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/utils/prisma";
import { z } from "zod";

const SignupSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    confirmEmail: z.string().email("Invalid email format"),
  })
  .refine((data) => data.email === data.confirmEmail, {
    message: "Emails don't match",
    path: ["confirmEmail"],
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = SignupSchema.parse(body);
    const { email, name } = validatedData;

    // Check if user already exists with this email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    // Check if user already exists with this name
    const existingUserByName = await prisma.user.findFirst({
      where: { name },
    });

    if (existingUserByName) {
      return NextResponse.json(
        { error: "User with this name already exists" },
        { status: 409 },
      );
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        name,
      },
    });

    // Return user data (excluding sensitive info)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        success: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 },
      );
    }

    console.error("Signup failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
