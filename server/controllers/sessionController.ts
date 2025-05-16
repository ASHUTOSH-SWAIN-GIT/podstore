import type { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const CreateSession = async (req: Request, res: Response) => {
    const { hostId, title } = req.body

    try {
        const session = await prisma.session.create({
            data: {
                hostId,
                title
            }
        })
        res.status(201).json(session)
    } catch (error) {

    }

}


export const getSessionData = async (req: Request, res: Response) => {
    const { id } = req.body

   try {
    const session = prisma.session.findMany({
        where: {
            id
        },
        include: {
            host: true,
            participants: {
                include: {
                    user: true,
                    mediaFiles: true
                },
            },
            mediaFiles: true,
            processingJob: true
        }
    })
    if (!session) {
        res.status(404).json({ message: "session not found" })
    }
   } catch (error) {
    res.status(500).json({ error: "Failed to fetch session" });
   }
}


export const getAllSessions = async (req: Request, res: Response) => {
    try {
      const sessions = await prisma.session.findMany({
        orderBy: { createdAt: 'desc' },
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
  
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};