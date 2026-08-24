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

    if (!athlete) {
      unmatched.push({ testId: test.id, profileName, recordedDate });
      continue;
    }

    const metrics = extractCmjMetrics(test);
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
