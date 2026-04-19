"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import type { ActiveSystemBanner } from "@/lib/types";

type SystemMessageBarProps = {
  announcement: ActiveSystemBanner;
};

function formatEndsAt(endsAt: string | null) {
  if (!endsAt) {
    return null;
  }

  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));
}

export function SystemMessageBar({ announcement }: SystemMessageBarProps) {
  const endsAtLabel = formatEndsAt(announcement.endsAt);
  const className =
    "stage-panel mx-auto flex w-full max-w-[92rem] items-center gap-3 rounded-[24px] px-3 py-2.5 sm:px-4";
  const label =
    announcement.type === "final-results"
      ? "\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05E1\u05D5\u05E4\u05D9\u05D5\u05EA"
      : "\u05D4\u05D5\u05D3\u05E2\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA";

  const content = (
    <>
      <div className="broadcast-chip shrink-0 px-2.5 py-1.5 text-[0.72rem] sm:text-xs">
        <Radio size={13} />
        <span>{label}</span>
      </div>

      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-medium leading-6 text-white sm:text-[0.95rem]">
          {announcement.message}
        </p>
        {endsAtLabel ? (
          <p className="text-[0.68rem] text-[var(--text-dim)] sm:text-[0.72rem]">
            {"\u05E4\u05E2\u05D9\u05DC \u05E2\u05D3 "}{endsAtLabel}
          </p>
        ) : null}
      </div>

      {announcement.type === "final-results" ? (
        <span className="hero-button-secondary shrink-0 rounded-full px-3 py-1.5 text-[0.72rem] text-white sm:text-xs">
          {"\u05DC\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA"}
        </span>
      ) : null}
    </>
  );

  if (announcement.type === "final-results") {
    return (
      <Link
        href="/results"
        dir="rtl"
        data-system-message-bar
        className={`${className} transition hover:-translate-y-0.5`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div dir="rtl" data-system-message-bar className={className}>
      {content}
    </div>
  );
}
