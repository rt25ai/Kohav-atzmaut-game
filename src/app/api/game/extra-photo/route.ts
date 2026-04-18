import { NextResponse } from "next/server";
import { z } from "zod";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  playerId: z.string().min(4),
  caption: z.string().max(120).default(""),
  photoUrl: z.string().min(20),
  thumbnailUrl: z.string().nullable(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "נתוני התמונה הנוספת לא תקינים" },
      { status: 400 },
    );
  }

  try {
    const result = await repository.submitExtraPhoto(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "לא הצלחנו לשמור את התמונה בגלריה",
      },
      { status: 400 },
    );
  }
}
