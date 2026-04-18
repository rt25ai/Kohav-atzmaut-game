import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const csv = await repository.exportPlayersCsv();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kochav-michael-players.csv"',
    },
  });
}
