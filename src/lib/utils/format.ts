export function formatPoints(points: number) {
  return `${new Intl.NumberFormat("he-IL").format(points)} נק׳`;
}

export function formatRelativeTime(dateString: string) {
  const value = new Date(dateString).getTime();
  const diffSeconds = Math.round((Date.now() - value) / 1000);
  const formatter = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });

  if (Math.abs(diffSeconds) < 60) {
    return formatter.format(-diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(-diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  return formatter.format(-diffHours, "hour");
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
