import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

const isoDateSchema = z.string().datetime({ offset: true });

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    message: z.string().trim().min(1).max(180),
    scheduledFor: isoDateSchema.nullish(),
    endsMode: z.union([z.literal("until_next"), z.literal("at_time")]),
    endsAt: isoDateSchema.nullish(),
  }),
  z.object({
    action: z.literal("activate-now"),
    hostAnnouncementId: z.string().min(4),
  }),
  z.object({
    action: z.literal("stop-now"),
    hostAnnouncementId: z.string().min(4),
  }),
  z.object({
    action: z.literal("cancel"),
    hostAnnouncementId: z.string().min(4),
  }),
  z.object({
    action: z.literal("delete"),
    hostAnnouncementId: z.string().min(4),
  }),
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "פעולת הודעת מנחה לא תקינה" }, { status: 400 });
  }

  if (parsed.data.action === "create") {
    const scheduledFor = parsed.data.scheduledFor ?? new Date().toISOString();
    const endsAt =
      parsed.data.endsMode === "at_time" ? parsed.data.endsAt ?? null : null;

    if (parsed.data.endsMode === "at_time" && !endsAt) {
      return NextResponse.json({ error: "צריך להגדיר זמן סיום" }, { status: 400 });
    }

    if (
      endsAt &&
      new Date(endsAt).getTime() <= new Date(scheduledFor).getTime()
    ) {
      return NextResponse.json(
        { error: "זמן הסיום צריך להיות אחרי זמן ההפעלה" },
        { status: 400 },
      );
    }

    const announcement = await repository.createHostAnnouncement({
      message: parsed.data.message,
      scheduledFor,
      endsMode: parsed.data.endsMode,
      endsAt,
    });

    return NextResponse.json({ announcement });
  }

  if (parsed.data.action === "activate-now") {
    const announcement = await repository.activateHostAnnouncementNow(
      parsed.data.hostAnnouncementId,
    );
    return NextResponse.json({ announcement });
  }

  if (parsed.data.action === "stop-now") {
    const announcement = await repository.stopHostAnnouncementNow(
      parsed.data.hostAnnouncementId,
    );
    return NextResponse.json({ announcement });
  }

  if (parsed.data.action === "cancel") {
    const announcement = await repository.cancelHostAnnouncement(
      parsed.data.hostAnnouncementId,
    );
    return NextResponse.json({ announcement });
  }

  const announcement = await repository.deleteHostAnnouncement(
    parsed.data.hostAnnouncementId,
  );
  return NextResponse.json({ announcement });
}
