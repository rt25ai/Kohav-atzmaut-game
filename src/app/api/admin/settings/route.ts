import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  introText: z.string().max(240).optional(),
  prizeLabels: z
    .object({
      first: z.string().max(80).optional(),
      second: z.string().max(80).optional(),
      third: z.string().max(80).optional(),
    })
    .optional(),
  globalSoundEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "הגדרות לא תקינות" }, { status: 400 });
  }

  const settings = await repository.updateSettings(parsed.data);
  return NextResponse.json({ settings });
}
