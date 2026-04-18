import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset"),
    playerId: z.string().min(4),
  }),
  z.object({
    action: z.literal("adjust"),
    playerId: z.string().min(4),
    delta: z.number().int().min(-1000).max(1000),
  }),
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
  }

  if (parsed.data.action === "reset") {
    const session = await repository.resetPlayer(parsed.data.playerId);
    return NextResponse.json({ session });
  }

  const session = await repository.adjustPlayerPoints({
    playerId: parsed.data.playerId,
    delta: parsed.data.delta,
  });
  return NextResponse.json({ session });
}
