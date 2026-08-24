/**
 * All "what day is it" logic goes through here, in the club's timezone —
 * never the server's. A server running UTC stamps reports and greetings
 * with tomorrow's date from late afternoon onward otherwise.
 */
export const CLUB_TIMEZONE = process.env.CLUB_TIMEZONE || "America/New_York";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIMEZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

/** A stable "YYYY-MM-DD" key for the club-local calendar day a Date falls on. */
export function clubLocalDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

export function isSameClubDay(a: Date, b: Date): boolean {
  return clubLocalDayKey(a) === clubLocalDayKey(b);
}

export function formatDateInClubTz(date: Date): string {
  return displayFormatter.format(date);
}

/**
 * Whole calendar days between two instants, counted in club-local days —
 * not a raw ms/86400000 division, which misclassifies "11pm yesterday" vs
 * "1am today" as zero days apart even though the calendar day already turned over.
 * Both day keys are plain YYYY-MM-DD strings; parsing them as UTC midnight and
 * diffing is safe (no timezone component left) and immune to DST shifts.
 */
export function daysBetweenClubDays(earlier: Date, later: Date): number {
  return Math.round((Date.parse(clubLocalDayKey(later)) - Date.parse(clubLocalDayKey(earlier))) / 86_400_000);
}

/** "Today" / "Yesterday" / "N days ago", computed from club-local calendar days. */
export function daysAgoLabel(date: Date, now: Date = new Date()): string {
  const diffDays = daysBetweenClubDays(date, now);
  if (diffDays <= 0) return "Today"; // clock skew guard — never show a future date as negative days ago
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
