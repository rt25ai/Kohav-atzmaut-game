import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  photoId: z.string().min(4),
  action: z.union([z.literal("hide"), z.literal("delete"), z.literal("restore")]),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "פעולת תמונה לא תקינה" }, { status: 400 });
  }

  const photo = await repository.moderatePhoto(parsed.data);
  return NextResponse.json({ photo });
}
