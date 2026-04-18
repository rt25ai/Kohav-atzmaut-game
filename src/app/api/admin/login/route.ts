import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminPassword, setAdminCookie } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success || parsed.data.password !== getAdminPassword()) {
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
