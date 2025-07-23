import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";

const TokenRequestSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sessionId } = TokenRequestSchema.parse(body);

    // If no userId provided, generate a temporary token for join flow
    const identity = userId || `temp-${Date.now()}`;

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity,
        ttl: "10m",
      },
    );

    at.addGrant({ roomJoin: true, room: sessionId });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return new NextResponse("Bad Request", { status: 400 });
  }
}
