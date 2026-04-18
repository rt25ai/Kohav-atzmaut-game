import { NextResponse } from "next/server";
import { z } from "zod";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  playerId: z.string().min(4),
  missionId: z.string().min(3),
  stepIndex: z.number().int().min(0),
  caption: z.string().max(120).default(""),
  newPeopleMet: z.number().int().min(0).max(99).default(0),
  skipped: z.boolean(),
  photoUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "נתוני משימה לא תקינים" }, { status: 400 });
  }

  try {
    const result = await repository.submitMission(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "לא הצלחנו לשמור את המשימה" },
      { status: 400 },
    );
  }
}
