import { NextResponse } from "next/server";
import { z } from "zod";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  playerId: z.string().min(4),
  questionId: z.string().min(3),
  stepIndex: z.number().int().min(0),
  selectedOptionId: z.union([z.literal("a"), z.literal("b"), z.literal("c"), z.literal("d"), z.null()]),
  responseMs: z.number().int().min(0),
  skipped: z.boolean(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "נתוני תשובה לא תקינים" }, { status: 400 });
  }

  try {
    const result = await repository.submitAnswer(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "לא הצלחנו לשמור את התשובה" },
      { status: 400 },
    );
  }
}
