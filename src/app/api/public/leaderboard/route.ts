import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = await repository.getLeaderboard();
  return NextResponse.json({ leaderboard });
}
