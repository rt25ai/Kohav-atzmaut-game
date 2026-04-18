import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "חסר מזהה שחקן" }, { status: 400 });
  }

  try {
    const results = await repository.getSurveyResults(playerId);

    if (!results.completed) {
      return NextResponse.json(
        { error: "תוצאות הסקר נפתחות רק אחרי שמסיימים" },
        { status: 403 },
      );
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "השחקן לא נמצא" }, { status: 404 });
  }
}
