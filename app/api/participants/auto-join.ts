import { prisma } from "@/lib/utils/prisma";
import { nanoid } from "nanoid";
import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, name } = req.body;

  if (!token || !name) {
    return res.status(400).json({ error: "Missing token or name" });
  }

  const session = await prisma.session.findUnique({
    where: { joinToken: token },
  });

  if (!session) {
    return res.status(404).json({ error: "Invalid token" });
  }

  const user = await prisma.user.findFirst({
    where: { name },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const participant = await prisma.participation.create({
    data: {
      userId: user.id,
      sessionId: session.id,
      role: "GUEST",
    },
  });

  return res.status(200).json({
    sessionId: session.id,
    participantId: participant.id,
    userId: user.id,
  });
}
