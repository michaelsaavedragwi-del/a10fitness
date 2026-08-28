import { prisma } from "@/lib/db";
import { getAthletes, getTestsSince } from "./client";
import {
  TRU_STRENGTH_CANONICAL_IDS,
  extractTruStrengthMetrics,
  normalizeName,
  truStrengthDirection,
  truStrengthMode,
  truStrengthSide,
  type TruStrengthMetrics,
} from "./mapping";

const TRU_STRENGTH_CANONICAL_ID_SET: string[] = Object.values(TRU_STRENGTH_CANONICAL_IDS);

export interface PreviewMatchedTruStrengthTest {
  testId: string;
  profileName: string;
  athleteId: string;
  athleteName: string;
  recordedDate: string; // ISO
  side: "Left" | "Right" | null;
  direction: "Internal" | "External" | null;
  mode: "Isometric" | "Free Run";
  metrics: TruStrengthMetrics;
}

export interface PreviewUnmatchedTruStrengthTest {
  testId: string;
  profileName: string;
  recordedDate: string; // ISO
  side: "Left" | "Right" | null;
  direction: "Internal" | "External" | null;
  mode: "Isometric" | "Free Run";
  /** Null if this test's metrics aren't calculable yet — can still be dismissed, not created. */
  metrics: TruStrengthMetrics | null;
  /** From Hawkin's own `dob` (a bare year) — only used to pre-fill a new athlete on Create & Import. */
  birthYear: number | null;
}

function parseBirthYear(dob: string | undefined): number | null {
  if (!dob) return null;
  const n = parseInt(dob, 10);
  return Number.isFinite(n) && n > 1900 && n <= new Date().getFullYear() ? n : null;
}

export interface TruStrengthSyncPreview {
  matched: PreviewMatchedTruStrengthTest[];
  unmatched: PreviewUnmatchedTruStrengthTest[];
}

/** Only surfaces Tru Strength tests, and skips anything already imported or previously dismissed. */
export async function buildTruStrengthPreview(sinceDays = 30): Promise<TruStrengthSyncPreview> {
  const sinceUnixSeconds = Math.floor(Date.now() / 1000) - sinceDays * 86_400;

  const [hawkinAthletes, athletes, dismissed, existingTestIds, tests] = await Promise.all([
    getAthletes(),
    prisma.athlete.findMany(),
    prisma.dismissedTest.findMany(),
    prisma.truStrengthTest.findMany({ where: { externalTestId: { not: null } }, select: { externalTestId: true } }),
    getTestsSince(sinceUnixSeconds),
  ]);

  const dismissedIds = new Set(dismissed.map((d) => d.externalTestId));
  const importedIds = new Set(existingTestIds.map((t) => t.externalTestId as string));

  const hawkinAthleteById = new Map(hawkinAthletes.map((a) => [a.id, a]));
  const athleteByNormalizedName = new Map(athletes.map((a) => [normalizeName(a.name), a]));

  const tsTests = tests.filter((t) => TRU_STRENGTH_CANONICAL_ID_SET.includes(t.testType.canonicalId));

  const matched: PreviewMatchedTruStrengthTest[] = [];
  const unmatched: PreviewUnmatchedTruStrengthTest[] = [];

  for (const test of tsTests) {
    if (importedIds.has(test.id) || dismissedIds.has(test.id)) continue;

    const profileName = (hawkinAthleteById.get(test.athlete.id)?.name ?? test.athlete.name).trim();
    const recordedDate = new Date(test.timestamp * 1000).toISOString();
    const athlete = athleteByNormalizedName.get(normalizeName(profileName));

    const metrics = extractTruStrengthMetrics(test);
    const side = truStrengthSide(test);
    const direction = truStrengthDirection(test);
    const mode = truStrengthMode(test.testType.canonicalId);

    if (!athlete) {
      unmatched.push({
        testId: test.id,
        profileName,
        recordedDate,
        side,
        direction,
        mode,
        metrics,
        birthYear: parseBirthYear(hawkinAthleteById.get(test.athlete.id)?.dob),
      });
      continue;
    }

    if (!metrics) continue; // metrics not yet calculable for this test

    matched.push({
      testId: test.id,
      profileName,
      athleteId: athlete.id,
      athleteName: athlete.name,
      recordedDate,
      side,
      direction,
      mode,
      metrics,
    });
  }

  return { matched, unmatched };
}

/** Writes one synced Tru Strength test. Dedupes on externalTestId via the unique constraint. */
export async function importMatchedTruStrengthTest(
  test: PreviewMatchedTruStrengthTest,
): Promise<"imported" | "duplicate"> {
  const existing = await prisma.truStrengthTest.findUnique({ where: { externalTestId: test.testId } });
  if (existing) return "duplicate";

  await prisma.truStrengthTest.create({
    data: {
      athleteId: test.athleteId,
      date: new Date(test.recordedDate),
      side: test.side,
      direction: test.direction,
      mode: test.mode,
      externalTestId: test.testId,
      ...test.metrics,
    },
  });

  return "imported";
}

/**
 * Creates a new athlete from an unmatched Hawkin profile, then imports the
 * Tru Strength test that surfaced them — explicit, one-click, never
 * automatic. If an athlete with this exact name already exists (e.g. from a
 * CMJ sync, or someone else just created it), reuses that athlete instead of
 * erroring — the unique constraint on Athlete.name is the source of truth.
 */
export async function createTruStrengthAthleteAndImport(
  test: PreviewUnmatchedTruStrengthTest,
): Promise<{ athleteId: string; result: "imported" | "duplicate" }> {
  if (!test.metrics) {
    throw new Error(`No calculable metrics yet for ${test.profileName}'s test — nothing to import.`);
  }

  const athlete = await prisma.athlete.upsert({
    where: { name: test.profileName },
    create: {
      name: test.profileName,
      sport: "",
      birthYear: test.birthYear,
      pp: 0,
      ppbm: 0,
      ci: 0,
      brfd: 0,
      mrsi: 0,
    },
    update: {},
  });

  const result = await importMatchedTruStrengthTest({
    testId: test.testId,
    profileName: test.profileName,
    athleteId: athlete.id,
    athleteName: athlete.name,
    recordedDate: test.recordedDate,
    side: test.side,
    direction: test.direction,
    mode: test.mode,
    metrics: test.metrics,
  });

  return { athleteId: athlete.id, result };
}

/** The nightly job: auto-import every matched test, record unmatched names for the coach to review. */
export async function runNightlyTruStrengthSync(): Promise<{ imported: number; unmatched: string[] }> {
  let preview: TruStrengthSyncPreview;
  try {
    preview = await buildTruStrengthPreview();
  } catch (err) {
    await prisma.syncState.upsert({
      where: { id: "tru-strength" },
      create: { id: "tru-strength", lastError: err instanceof Error ? err.message : "Sync failed", lastErrorAt: new Date() },
      update: { lastError: err instanceof Error ? err.message : "Sync failed", lastErrorAt: new Date() },
    });
    throw err;
  }

  let imported = 0;
  for (const test of preview.matched) {
    const result = await importMatchedTruStrengthTest(test);
    if (result === "imported") imported++;
  }

  const unmatchedNames = Array.from(new Set(preview.unmatched.map((u) => u.profileName)));

  await prisma.syncState.upsert({
    where: { id: "tru-strength" },
    create: { id: "tru-strength", lastRunAt: new Date(), imported, unmatched: unmatchedNames, lastError: null, lastErrorAt: null },
    update: { lastRunAt: new Date(), imported, unmatched: unmatchedNames, lastError: null, lastErrorAt: null },
  });

  return { imported, unmatched: unmatchedNames };
}
