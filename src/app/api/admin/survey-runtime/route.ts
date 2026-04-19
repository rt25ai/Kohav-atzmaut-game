import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.union([
    z.literal("publish-final-results"),
    z.literal("reopen-live-survey"),
  ]),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "פעולת סקר סופית לא תקינה" },
      { status: 400 },
    );
  }

  const runtime =
    parsed.data.action === "publish-final-results"
      ? await repository.publishFinalSurveyResults()
      : await repository.reopenSurveyToLive();
  return NextResponse.json({ runtime });
}
