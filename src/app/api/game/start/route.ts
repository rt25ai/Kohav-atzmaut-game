import { NextResponse } from "next/server";
import { z } from "zod";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(32),
  participantType: z
    .enum(["solo_male", "solo_female", "family"])
    .default("solo_male"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "יש להזין שם באורך 2 עד 32 תווים" },
      { status: 400 },
    );
  }

  try {
    const session = await repository.startGame(parsed.data);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "לא הצלחנו לפתוח משחק חדש כרגע" },
      { status: 400 },
    );
  }
}
