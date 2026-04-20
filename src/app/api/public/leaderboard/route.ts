import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = await repository.getLeaderboard();
  return NextResponse.json(
    { leaderboard },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
      },
    },
  );
}
