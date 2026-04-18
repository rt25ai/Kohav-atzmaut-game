import { NextResponse } from "next/server";
import { z } from "zod";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  playerId: z.string().min(4),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "שחקן לא תקין" }, { status: 400 });
  }

  try {
    const result = await repository.heartbeat(parsed.data.playerId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "לא הצלחנו לעדכן דופק שחקן" },
      { status: 400 },
    );
  }
}
