"use client";

import { ArrowLeftRight } from "lucide-react";

type AdminRailHintProps = {
  label?: string;
};

export function AdminRailHint({
  label = "גררו הצידה כדי לראות עוד",
}: AdminRailHintProps) {
  return (
    <div
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] bg-[#eaf3ff] px-3 py-2 text-sm text-[#1f3f6e] md:hidden"
      data-admin-rail-hint
    >
      <ArrowLeftRight size={14} />
      <span>{label}</span>
    </div>
  );
}
