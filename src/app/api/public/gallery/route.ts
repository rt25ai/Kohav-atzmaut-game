import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const photos = await repository.getGallery();
  return NextResponse.json({ photos });
}
