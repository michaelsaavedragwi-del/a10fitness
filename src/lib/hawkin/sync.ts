import { prisma } from "@/lib/db";
import { CMJ_CANONICAL_ID, getAthletes, getTestsSince } from "./client";
import { extractCmjMetrics, extractExtendedMetrics, normalizeName, type CmjMetrics, type ExtendedMetrics } from "./mapping";

export interface PreviewMatchedTest {
  testId: string;
  profileName: string;
  athleteId: string;
  athleteName: string;
  recordedDate: string; // ISO
  metrics: CmjMetrics;
  extended: ExtendedMetrics;
}

export interface PreviewUnmatchedTest {
  testId: string;
  profileName: string;
  recordedDate: string; // ISO
  /** Null if this test's metrics aren't calculable yet — can still be dismissed, not created. */
  metrics: CmjMetrics | null;
  extended: ExtendedMetrics | null;
  /** From Hawkin's own `dob` (a bare year) — only used to pre-fill a new athlete on Create & Import. */
  birthYear: number | null;
}

/** Level assigned to an athlete auto-created from an unmatched Hawkin profile — Hawkin has no concept of level. */
export const AUTO_CREATED_LEVEL = "Unassigned";

function parseBirthYear(dob: string | undefined): number | null {
  if (!dob) return null;
  const n = parseInt(dob, 10);
  return Number.isFinite(n) && n > 1900 && n <= new Date().getFullYear() ? n : null;
}

export interface SyncPreview {
  matched: PreviewMatchedTest[];
  unmatched: PreviewUnmatchedTest[];
}

/** Only surfaces CMJ tests, and skips anything already imported or previously dismissed. */
export async function buildPreview(sinceDays = 30): Promise<SyncPreview> {
  const sinceUnixSeconds = Math.floor(Date.now() / 1000) - sinceDays * 86_400;

  const [hawkinAthletes, athletes, dismissed, existingTestIds, tests] = await Promise.all([
    getAthletes(),
    prisma.athlete.findMany(),
    prisma.dismissedTest.findMany(),
    prisma.testEntry.findMany({ where: { externalTestId: { not: null } }, select: { externalTestId: true } }),
    getTestsSince(sinceUnixSeconds),
  ]);

  const dismissedIds = new Set(dismissed.map((d) => d.externalTestId));
  const importedIds = new Set(existingTestIds.map((t) => t.externalTestId as string));

  const hawkinAthleteById = new Map(hawkinAthletes.map((a) => [a.id, a]));
  const athleteByNormalizedName = new Map(athletes.map((a) => [normalizeName(a.name), a]));

  const cmjTests = tests.filter((t) => t.testType.canonicalId === CMJ_CANONICAL_ID);

  const matched: PreviewMatchedTest[] = [];
  const unmatched: PreviewUnmatchedTest[] = [];

  for (const test of cmjTests) {
    if (importedIds.has(test.id) || dismissedIds.has(test.id)) continue;

    const profileName = (hawkinAthleteById.get(test.athlete.id)?.name ?? test.athlete.name).trim();
    const recordedDate = new Date(test.timestamp * 1000).toISOString();
    const athlete = athleteByNormalizedName.get(normalizeName(profileName));

    const metrics = extractCmjMetrics(test);

    if (!athlete) {
      unmatched.push({
        testId: test.id,
        profileName,
        recordedDate,
        metrics,
        extended: metrics ? extractExtendedMetrics(test) : null,
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
      metrics,
      extended: extractExtendedMetrics(test),
    });
  }

  return { matched, unmatched };
}

/**
 * Writes one synced CMJ test. Same PR/re-test-clock rules as a manual entry:
 * a test always resets the re-test clock, but only bumps a PR when it's actually higher.
 * Dedupes on externalTestId via the TestEntry unique constraint.
 */
export async function importMatchedTest(test: PreviewMatchedTest): Promise<"imported" | "duplicate"> {
  const existing = await prisma.testEntry.findUnique({ where: { externalTestId: test.testId } });
  if (existing) return "duplicate";

  const date = new Date(test.recordedDate);
  const { pp, ppbm, ci, brfd, mrsi } = test.metrics;

  await prisma.testEntry.create({
    data: {
      athleteId: test.athleteId,
      date,
      isForcePlate: true,
      pp,
      ppbm,
      ci,
      brfd,
      mrsi,
      mph: 0,
      externalTestId: test.testId,
      ...test.extended,
    },
  });

  const athlete = await prisma.athlete.findUniqueOrThrow({ where: { id: test.athleteId } });
  const updates: Record<string, number | Date> = {};
  if (pp > athlete.pp) updates.pp = pp;
  if (ppbm > athlete.ppbm) updates.ppbm = ppbm;
  if (ci > athlete.ci) updates.ci = ci;
  if (brfd > athlete.brfd) updates.brfd = brfd;
  if (mrsi > athlete.mrsi) updates.mrsi = mrsi;
  if (!athlete.lastTestedAt || date > athlete.lastTestedAt) updates.lastTestedAt = date;

  if (Object.keys(updates).length > 0) {
    await prisma.athlete.update({ where: { id: test.athleteId }, data: updates });
  }

  return "imported";
}

/**
 * Creates a new athlete from an unmatched Hawkin profile, then imports the
 * test that surfaced them — this is the explicit, one-click "Create & Import"
 * action, never automatic. Level defaults to AUTO_CREATED_LEVEL since Hawkin
 * doesn't send one; a coach corrects it later on the Roster page. If an
 * athlete with this exact name already exists (e.g. a duplicate profile
 * click, or someone else just created it), reuses that athlete instead of
 * erroring — the unique constraint on Athlete.name is the source of truth.
 */
export async function createAthleteAndImport(
  test: PreviewUnmatchedTest,
): Promise<{ athleteId: string; result: "imported" | "duplicate" }> {
  if (!test.metrics) {
    throw new Error(`No calculable metrics yet for ${test.profileName}'s test — nothing to import.`);
  }

  const athlete = await prisma.athlete.upsert({
    where: { name: test.profileName },
    create: {
      name: test.profileName,
      level: AUTO_CREATED_LEVEL,
      birthYear: test.birthYear,
      pp: 0,
      ppbm: 0,
      ci: 0,
      brfd: 0,
      mrsi: 0,
    },
    update: {},
  });

  const result = await importMatchedTest({
    testId: test.testId,
    profileName: test.profileName,
    athleteId: athlete.id,
    athleteName: athlete.name,
    recordedDate: test.recordedDate,
    metrics: test.metrics,
    extended: test.extended ?? { peakLandingForce: 0, timeToStabilization: 0, landingPerformanceIndex: 0, lrBrakingImpulseIndex: 0, lrPropulsiveImpulseIndex: 0, lrLandingImpulseIndex: 0, propulsivePhase: 0, takeoffVelocity: 0, peakVelocity: 0 },
  });

  return { athleteId: athlete.id, result };
}

/** The nightly job: auto-import every matched test, record unmatched names for the coach to review. */
export async function runNightlySync(): Promise<{ imported: number; unmatched: string[] }> {
  let preview: SyncPreview;
  try {
    preview = await buildPreview();
  } catch (err) {
    await prisma.syncState.upsert({
      where: { id: "main" },
      create: { id: "main", lastError: err instanceof Error ? err.message : "Sync failed", lastErrorAt: new Date() },
      update: { lastError: err instanceof Error ? err.message : "Sync failed", lastErrorAt: new Date() },
    });
    throw err;
  }

  let imported = 0;
  for (const test of preview.matched) {
    const result = await importMatchedTest(test);
    if (result === "imported") imported++;
  }

  const unmatchedNames = Array.from(new Set(preview.unmatched.map((u) => u.profileName)));

  await prisma.syncState.upsert({
    where: { id: "main" },
    create: { id: "main", lastRunAt: new Date(), imported, unmatched: unmatchedNames, lastError: null, lastErrorAt: null },
    update: { lastRunAt: new Date(), imported, unmatched: unmatchedNames, lastError: null, lastErrorAt: null },
  });

  return { imported, unmatched: unmatchedNames };
}
