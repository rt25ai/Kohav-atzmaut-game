"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/utils/format";

type RelativeTimeTextProps = {
  value: string;
};

export function RelativeTimeText({ value }: RelativeTimeTextProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <span>לפני רגע</span>;
  }

  return <span>{formatRelativeTime(value)}</span>;
}
