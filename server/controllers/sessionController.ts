import type { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import type { Session } from "inspector/promises"

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