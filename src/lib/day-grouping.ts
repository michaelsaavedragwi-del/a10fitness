import type { TestEntry } from "@prisma/client";
import { clubLocalDayKey } from "@/lib/timezone";

/**
 * A velocity logged the same day as a plate test is one session to a coach,
 * even though they're two records underneath. Grouping is display-only —
 * the underlying rows (and the vendor test id used for dedupe) stay separate.
 */
export interface DayGroup {
  dayKey: string; // club-local YYYY-MM-DD
  date: Date; // representative timestamp for sorting (earliest entry that day)
  entries: TestEntry[];
  /** The best (highest pp) force-plate entry that day, if any. */
  forcePlateEntry: TestEntry | null;
  /** The best (highest mph) entry with a measured performance that day, if any — may be the same row as forcePlateEntry. */
  performanceEntry: TestEntry | null;
}

/** Groups entries by club-local calendar day. Does not sort the resulting groups — callers sort as needed. */
export function groupTestsByDay(tests: TestEntry[]): DayGroup[] {
  const byDay = new Map<string, TestEntry[]>();
  for (const t of tests) {
    const key = clubLocalDayKey(t.date);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(t);
    else byDay.set(key, [t]);
  }

  const groups: DayGroup[] = [];
  for (const [dayKey, entries] of byDay) {
    const forcePlateCandidates = entries.filter((e) => e.isForcePlate && e.pp > 0);
    const performanceCandidates = entries.filter((e) => e.mph > 0);
    const forcePlateEntry =
      forcePlateCandidates.length > 0 ? forcePlateCandidates.reduce((best, e) => (e.pp > best.pp ? e : best)) : null;
    const performanceEntry =
      performanceCandidates.length > 0 ? performanceCandidates.reduce((best, e) => (e.mph > best.mph ? e : best)) : null;

    const earliest = entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date);
    groups.push({ dayKey, date: earliest, entries, forcePlateEntry, performanceEntry });
  }

  return groups;
}
