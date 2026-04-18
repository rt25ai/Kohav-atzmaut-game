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
    const session = await repository.getSession(playerId);
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "השחקן לא נמצא" }, { status: 404 });
  }
}
