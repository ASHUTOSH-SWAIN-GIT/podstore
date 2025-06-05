import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (!email && !name) {
      return NextResponse.json(
        { error: 'Either email or name parameter is required' },
        { status: 400 }
      );
    }

    let existingUser = null;

    if (email) {
      existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }
      });
    }

    if (!existingUser && name) {
      existingUser = await prisma.user.findFirst({
        where: { name },
        select: { id: true, name: true }
      });
    }

    return NextResponse.json({
      exists: !!existingUser,
      field: existingUser ? (email ? 'email' : 'name') : null
    });

  } catch (error) {
    console.error('User check failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 