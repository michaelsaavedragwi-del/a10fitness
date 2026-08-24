import { prisma } from "@/lib/db";
import { daysAgoLabel } from "@/lib/timezone";
import { groupTestsByDay } from "@/lib/day-grouping";

export interface ActivityItem {
  athleteId: string;
  athleteName: string;
  date: Date;
  dayLabel: string;
  pp: number | null;
  ppDelta: number | null;
  ppIsPr: boolean;
  mph: number | null;
  mphDelta: number | null;
  mphIsPr: boolean;
}

function round1(n: number): number {
  return parseFloat(n.toFixed(1));
}

/**
 * Day-grouped feed of what actually happened, most recent first. A PR marks
 * an entry that beats the athlete's best EVER, not merely their last one —
 * computed by walking each athlete's full history in order, so a re-test
 * that's merely close to (but under) their all-time best isn't mislabeled.
 */
export async function getRecentActivity(windowDays = 30, limit = 25): Promise<ActivityItem[]> {
  const athletes = await prisma.athlete.findMany({
    where: { archived: false },
    include: { tests: { orderBy: { date: "asc" } } },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const items: ActivityItem[] = [];

  for (const athlete of athletes) {
    const groups = groupTestsByDay(athlete.tests).sort((a, b) => a.date.getTime() - b.date.getTime());

    let bestPpSoFar = 0;
    let bestMphSoFar = 0;
    let prevPp: number | null = null;
    let prevMph: number | null = null;

    for (const g of groups) {
      const pp = g.forcePlateEntry?.pp ?? null;
      const mph = g.performanceEntry?.mph ?? null;

      const ppIsPr = pp !== null && pp > bestPpSoFar;
      const mphIsPr = mph !== null && mph > bestMphSoFar;
      const ppDelta = pp !== null && prevPp !== null ? round1(pp - prevPp) : null;
      const mphDelta = mph !== null && prevMph !== null ? round1(mph - prevMph) : null;

      if (g.date >= cutoff) {
        items.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          date: g.date,
          dayLabel: daysAgoLabel(g.date),
          pp,
          ppDelta,
          ppIsPr,
          mph,
          mphDelta,
          mphIsPr,
        });
      }

      if (pp !== null) {
        bestPpSoFar = Math.max(bestPpSoFar, pp);
        prevPp = pp;
      }
      if (mph !== null) {
        bestMphSoFar = Math.max(bestMphSoFar, mph);
        prevMph = mph;
      }
    }
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, limit);
}
