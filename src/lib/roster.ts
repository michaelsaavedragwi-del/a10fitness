import type { Athlete, TestEntry } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeRoster,
  METRIC_KEYS,
  type Category,
  type ComputedAthlete,
  type MetricStanding,
  type RawAthleteInput,
} from "@/lib/prediction";
import { daysBetweenClubDays } from "@/lib/timezone";

export const RETEST_WINDOW_DAYS = 60;
export const REPORT_REVIEW_WINDOW_DAYS = 60;

export interface RosterAthlete extends ComputedAthlete {
  level: string;
  birthYear: number | null;
  lastForcePlateTestAt: Date | null;
  daysSinceLastTest: number | null;
  retestOverdueByDays: number | null;
}

function toRaw(a: Athlete): RawAthleteInput {
  return {
    id: a.id,
    name: a.name,
    level: a.level,
    sex: a.sex ?? null,
    pp: a.pp,
    ppbm: a.ppbm,
    ci: a.ci,
    brfd: a.brfd,
    mrsi: a.mrsi,
    mph: a.mph,
    predOverride: a.predOverride ?? null,
  };
}

function emptyStandings(a: Athlete): Record<(typeof METRIC_KEYS)[number], MetricStanding> {
  const result = {} as Record<(typeof METRIC_KEYS)[number], MetricStanding>;
  for (const key of METRIC_KEYS) {
    result[key] = { value: a[key], rank: null, percentile: null, total: null, bottomQuartile: false };
  }
  return result;
}

function newestForcePlateDate(tests: TestEntry[]): Date | null {
  const fp = tests.filter((t) => t.isForcePlate);
  if (fp.length === 0) return null;
  return fp.reduce((max, t) => (t.date > max ? t.date : max), fp[0].date);
}

function withRetestInfo<T extends ComputedAthlete>(computed: T, athlete: Athlete & { tests: TestEntry[] }): RosterAthlete {
  const lastForcePlateTestAt = newestForcePlateDate(athlete.tests);
  const daysSinceLastTest = lastForcePlateTestAt ? daysBetweenClubDays(lastForcePlateTestAt, new Date()) : null;
  const retestOverdueByDays =
    daysSinceLastTest !== null && daysSinceLastTest > RETEST_WINDOW_DAYS
      ? daysSinceLastTest - RETEST_WINDOW_DAYS
      : null;
  return { ...computed, birthYear: athlete.birthYear, lastForcePlateTestAt, daysSinceLastTest, retestOverdueByDays };
}

async function loadActiveAthletesWithTests() {
  return prisma.athlete.findMany({
    where: { archived: false },
    include: { tests: { orderBy: { date: "desc" } } },
    orderBy: { name: "asc" },
  });
}

export async function getComputedRoster(): Promise<RosterAthlete[]> {
  const athletes = await loadActiveAthletesWithTests();
  const computed = computeRoster(athletes.map(toRaw));
  return computed.map((c) => {
    const athlete = athletes.find((a) => a.id === c.id)!;
    return withRetestInfo(c, athlete);
  });
}

export async function getAthleteProfile(id: string) {
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: { tests: { orderBy: { date: "desc" } } },
  });
  if (!athlete) return null;

  let computed: ComputedAthlete;
  if (athlete.archived) {
    computed = {
      ...toRaw(athlete),
      pred: null,
      gap: null,
      category: "insufficient data",
      isManualOverride: false,
      hasPlateData: athlete.pp > 0,
      hasPerformance: athlete.mph > 0,
      modelOffset: null,
      excludedFromFit: false,
      standings: emptyStandings(athlete),
    };
  } else {
    const activeAthletes = await prisma.athlete.findMany({ where: { archived: false } });
    const all = computeRoster(activeAthletes.map(toRaw));
    computed = all.find((a) => a.id === id)!;
  }

  return { athlete, computed: withRetestInfo(computed, athlete), tests: athlete.tests };
}

export interface Mover {
  athleteId: string;
  athleteName: string;
  delta: number;
  from: number;
  to: number;
  fromDate: Date;
  toDate: Date;
}

/** Largest gains between an athlete's two most recent qualifying tests. */
export async function getBiggestMovers(limit = 5): Promise<{ power: Mover[]; performance: Mover[] }> {
  const athletes = await loadActiveAthletesWithTests();

  const power: Mover[] = [];
  const performance: Mover[] = [];

  for (const a of athletes) {
    const fpTests = a.tests.filter((t) => t.isForcePlate && t.pp > 0);
    if (fpTests.length >= 2) {
      const [latest, previous] = fpTests;
      const delta = latest.pp - previous.pp;
      if (delta > 0) {
        power.push({
          athleteId: a.id,
          athleteName: a.name,
          delta,
          from: previous.pp,
          to: latest.pp,
          fromDate: previous.date,
          toDate: latest.date,
        });
      }
    }

    const perfTests = a.tests.filter((t) => t.mph > 0);
    if (perfTests.length >= 2) {
      const [latest, previous] = perfTests;
      const delta = latest.mph - previous.mph;
      if (delta > 0) {
        performance.push({
          athleteId: a.id,
          athleteName: a.name,
          delta,
          from: previous.mph,
          to: latest.mph,
          fromDate: previous.date,
          toDate: latest.date,
        });
      }
    }
  }

  power.sort((a, b) => b.delta - a.delta);
  performance.sort((a, b) => b.delta - a.delta);

  return { power: power.slice(0, limit), performance: performance.slice(0, limit) };
}

export interface LeaderboardEntry {
  athleteId: string;
  athleteName: string;
  level: string;
  sex: string | null;
  value: number;
}

export async function getLeaderboards(): Promise<{ performance: LeaderboardEntry[]; power: LeaderboardEntry[] }> {
  const athletes = await prisma.athlete.findMany({ where: { archived: false } });

  const toEntry = (a: Athlete, key: "mph" | "pp"): LeaderboardEntry => ({
    athleteId: a.id,
    athleteName: a.name,
    level: a.level,
    sex: a.sex ?? null,
    value: a[key],
  });

  const performance = athletes
    .filter((a) => a.mph > 0)
    .sort((a, b) => b.mph - a.mph)
    .map((a) => toEntry(a, "mph"));

  const power = athletes
    .filter((a) => a.pp > 0)
    .sort((a, b) => b.pp - a.pp)
    .map((a) => toEntry(a, "pp"));

  return { performance, power };
}

/** Chronological peak-power series per athlete, for trend sparklines. */
export async function getPpSparklines(athleteIds: string[]): Promise<Record<string, number[]>> {
  if (athleteIds.length === 0) return {};
  const tests = await prisma.testEntry.findMany({
    where: { athleteId: { in: athleteIds }, pp: { gt: 0 } },
    orderBy: { date: "asc" },
    select: { athleteId: true, pp: true },
  });
  const result: Record<string, number[]> = {};
  for (const t of tests) {
    (result[t.athleteId] ??= []).push(t.pp);
  }
  return result;
}

export interface ReportsListItem {
  id: string;
  name: string;
  level: string;
  category: Category;
  gap: number | null;
  lastReportReviewedAt: Date | null;
  reviewOverdueByDays: number | null; // null if never reviewed (see everReviewed) or not yet due
  everReviewed: boolean;
}

/** Every active athlete's report, worst gap first, with where the bi-monthly review cycle stands. */
export async function getReportsList(): Promise<ReportsListItem[]> {
  const [roster, rawAthletes] = await Promise.all([
    getComputedRoster(),
    prisma.athlete.findMany({ where: { archived: false }, select: { id: true, lastReportReviewedAt: true } }),
  ]);
  const reviewedById = new Map(rawAthletes.map((a) => [a.id, a.lastReportReviewedAt]));

  const items: ReportsListItem[] = roster.map((a) => {
    const lastReportReviewedAt = reviewedById.get(a.id) ?? null;
    const daysSinceReview = lastReportReviewedAt ? daysBetweenClubDays(lastReportReviewedAt, new Date()) : null;
    const reviewOverdueByDays =
      daysSinceReview !== null && daysSinceReview > REPORT_REVIEW_WINDOW_DAYS
        ? daysSinceReview - REPORT_REVIEW_WINDOW_DAYS
        : null;
    return {
      id: a.id,
      name: a.name,
      level: a.level,
      category: a.category,
      gap: a.gap,
      lastReportReviewedAt,
      reviewOverdueByDays,
      everReviewed: lastReportReviewedAt !== null,
    };
  });

  // Worst gap first (most negative), athletes without a gap yet trail behind, sorted by name.
  items.sort((a, b) => {
    if (a.gap !== null && b.gap !== null) return a.gap - b.gap;
    if (a.gap !== null) return -1;
    if (b.gap !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}
