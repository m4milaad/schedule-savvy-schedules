/** Exam dates arrive as ISO "YYYY-MM-DD" strings; compare them as local calendar days. */
export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m || 1) - 1, d || 1);
}

function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export interface ExamDateSummary {
  upcoming: string[];
  next: string | null;
  daysUntilNext: number | null;
  last: string | null;
}

export function summariseExamDates(examDates: string[], now: Date = new Date()): ExamDateSummary {
  const today = startOfToday(now).getTime();
  const upcoming = [...new Set(examDates)]
    .filter((d) => parseIsoDay(d).getTime() >= today)
    .sort();
  const next = upcoming[0] ?? null;
  const daysUntilNext = next === null ? null : Math.round((parseIsoDay(next).getTime() - today) / 86_400_000);
  return { upcoming, next, daysUntilNext, last: upcoming[upcoming.length - 1] ?? null };
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return parseIsoDay(iso).toLocaleDateString("en-GB", opts);
}

/** "today", "tomorrow", "in 16 days" */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
