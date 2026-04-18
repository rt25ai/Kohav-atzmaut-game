import { NextResponse } from "next/server";

import { IS_SUPABASE_ENABLED } from "@/lib/config";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await repository.getPublicSnapshot();
  return NextResponse.json({
    ...snapshot,
    mode: IS_SUPABASE_ENABLED ? "supabase" : "local",
  });
}
