import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const snapshot = await repository.getAdminSnapshot();
  return NextResponse.json({ snapshot });
}
