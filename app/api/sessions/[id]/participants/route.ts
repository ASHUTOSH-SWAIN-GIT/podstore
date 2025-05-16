import { NextResponse } from 'next/server'
import { prisma } from '@/lib/utils/prisma'


export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  try {
    const participants = await prisma.participation.findMany({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true } },
        mediaFiles: true,
      },
    })

    return NextResponse.json(participants)
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
  }
}


export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id
  const body = await req.json()
  const { userId, role } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const participation = await prisma.participation.create({
      data: {
        userId,
        sessionId,
        role: role || 'GUEST',
      },
    })

    return NextResponse.json(participation, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}
