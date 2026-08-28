"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SPORTS } from "@/lib/sports";

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (raw === null || raw === "") return 0;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function sexField(formData: FormData): string | null {
  const raw = str(formData, "sex");
  return raw === "Male" || raw === "Female" ? raw : null;
}

function sportField(formData: FormData): string {
  const raw = str(formData, "sport");
  return (SPORTS as readonly string[]).includes(raw) ? raw : "";
}

function birthYearField(formData: FormData): number | null {
  const raw = str(formData, "birthYear");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 1900 && n <= new Date().getFullYear() ? n : null;
}

function isDuplicateNameError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const EXTENDED_FIELDS = [
  "peakLandingForce",
  "timeToStabilization",
  "landingPerformanceIndex",
  "lrBrakingImpulseIndex",
  "lrPropulsiveImpulseIndex",
  "lrLandingImpulseIndex",
  "propulsivePhase",
  "takeoffVelocity",
  "peakVelocity",
] as const;

function extendedFields(formData: FormData, isForcePlate: boolean): Record<(typeof EXTENDED_FIELDS)[number], number> {
  const result = {} as Record<(typeof EXTENDED_FIELDS)[number], number>;
  for (const key of EXTENDED_FIELDS) {
    result[key] = isForcePlate ? num(formData, key) : 0;
  }
  return result;
}

export async function createAthlete(formData: FormData) {
  await requireOwner();

  const name = str(formData, "name");
  const sport = sportField(formData);
  if (!name || !sport) {
    redirect("/athletes/new?error=required");
  }

  const data = {
    name,
    sport,
    sex: sexField(formData),
    birthYear: birthYearField(formData),
    pp: num(formData, "pp"),
    ppbm: num(formData, "ppbm"),
    ci: num(formData, "ci"),
    brfd: num(formData, "brfd"),
    mrsi: num(formData, "mrsi"),
    mph: num(formData, "mph"),
  };

  let athleteId: string;
  try {
    const athlete = await prisma.athlete.create({ data });
    athleteId = athlete.id;

    // A manually-entered athlete with plate data counts as "tested today" for the re-test clock.
    if (data.pp > 0) {
      await prisma.athlete.update({ where: { id: athlete.id }, data: { lastTestedAt: new Date() } });
    }
  } catch (err) {
    if (isDuplicateNameError(err)) {
      redirect("/athletes/new?error=duplicate");
    }
    throw err;
  }

  revalidatePath("/");
  redirect(`/athletes/${athleteId}`);
}

export async function updateAthlete(athleteId: string, formData: FormData) {
  await requireOwner();

  const name = str(formData, "name");
  const sport = sportField(formData);
  if (!name || !sport) {
    redirect(`/athletes/${athleteId}/edit?error=required`);
  }

  const predOverrideRaw = str(formData, "predOverride");
  const predOverride = predOverrideRaw ? parseFloat(predOverrideRaw) : null;

  try {
    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        name,
        sport,
        sex: sexField(formData),
        birthYear: birthYearField(formData),
        predOverride: predOverride !== null && Number.isFinite(predOverride) ? predOverride : null,
      },
    });
  } catch (err) {
    if (isDuplicateNameError(err)) {
      redirect(`/athletes/${athleteId}/edit?error=duplicate`);
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}`);
}

export async function archiveAthlete(athleteId: string) {
  await requireOwner();
  await prisma.athlete.update({ where: { id: athleteId }, data: { archived: true } });
  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect("/");
}

export async function unarchiveAthlete(athleteId: string) {
  await requireOwner();
  await prisma.athlete.update({ where: { id: athleteId }, data: { archived: false } });
  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}`);
}

export async function deleteAthlete(athleteId: string) {
  await requireOwner();
  await prisma.athlete.delete({ where: { id: athleteId } });
  revalidatePath("/");
  redirect("/");
}

/**
 * A test is not a PR: appearing in a force-plate test resets the re-test clock
 * even if nothing beat a previous best. Beating a best is separate and only
 * bumps the stored PR when the new value is actually higher.
 */
export async function addTestEntry(athleteId: string, formData: FormData) {
  await requireOwner();

  const dateRaw = str(formData, "date");
  const date = dateRaw ? new Date(dateRaw) : new Date();
  const isForcePlate = formData.get("isForcePlate") === "on";

  const pp = isForcePlate ? num(formData, "pp") : 0;
  const ppbm = isForcePlate ? num(formData, "ppbm") : 0;
  const ci = isForcePlate ? num(formData, "ci") : 0;
  const brfd = isForcePlate ? num(formData, "brfd") : 0;
  const mrsi = isForcePlate ? num(formData, "mrsi") : 0;
  const mph = num(formData, "mph");

  await prisma.testEntry.create({
    data: { athleteId, date, isForcePlate, pp, ppbm, ci, brfd, mrsi, mph, ...extendedFields(formData, isForcePlate) },
  });

  const athlete = await prisma.athlete.findUniqueOrThrow({ where: { id: athleteId } });
  const updates: Record<string, number | Date> = {};
  if (pp > athlete.pp) updates.pp = pp;
  if (ppbm > athlete.ppbm) updates.ppbm = ppbm;
  if (ci > athlete.ci) updates.ci = ci;
  if (brfd > athlete.brfd) updates.brfd = brfd;
  if (mrsi > athlete.mrsi) updates.mrsi = mrsi;
  if (mph > athlete.mph) updates.mph = mph;
  if (isForcePlate && (!athlete.lastTestedAt || date > athlete.lastTestedAt)) {
    updates.lastTestedAt = date;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.athlete.update({ where: { id: athleteId }, data: updates });
  }

  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}`);
}

export async function updateTestEntry(testId: string, athleteId: string, formData: FormData) {
  await requireOwner();

  const dateRaw = str(formData, "date");
  const date = dateRaw ? new Date(dateRaw) : new Date();
  const isForcePlate = formData.get("isForcePlate") === "on";

  const pp = isForcePlate ? num(formData, "pp") : 0;
  const ppbm = isForcePlate ? num(formData, "ppbm") : 0;
  const ci = isForcePlate ? num(formData, "ci") : 0;
  const brfd = isForcePlate ? num(formData, "brfd") : 0;
  const mrsi = isForcePlate ? num(formData, "mrsi") : 0;
  const mph = num(formData, "mph");

  await prisma.testEntry.update({
    where: { id: testId },
    data: { date, isForcePlate, pp, ppbm, ci, brfd, mrsi, mph, ...extendedFields(formData, isForcePlate) },
  });

  // Recompute PRs and last-tested date from the full corrected history rather than
  // patching deltas, so an edit that lowers a value can't leave a stale, too-high PR behind.
  await recomputeAthleteFromHistory(athleteId);

  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}`);
}

export async function deleteTestEntry(testId: string, athleteId: string) {
  await requireOwner();
  await prisma.testEntry.delete({ where: { id: testId } });
  await recomputeAthleteFromHistory(athleteId);
  revalidatePath("/");
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}`);
}

async function recomputeAthleteFromHistory(athleteId: string) {
  const tests = await prisma.testEntry.findMany({ where: { athleteId } });
  const fpTests = tests.filter((t) => t.isForcePlate);
  const lastTestedAt = fpTests.length > 0 ? fpTests.reduce((max, t) => (t.date > max ? t.date : max), fpTests[0].date) : null;

  const maxOf = (key: "pp" | "ppbm" | "ci" | "brfd" | "mrsi" | "mph") =>
    tests.reduce((m, t) => Math.max(m, t[key]), 0);

  await prisma.athlete.update({
    where: { id: athleteId },
    data: {
      pp: maxOf("pp"),
      ppbm: maxOf("ppbm"),
      ci: maxOf("ci"),
      brfd: maxOf("brfd"),
      mrsi: maxOf("mrsi"),
      mph: maxOf("mph"),
      lastTestedAt,
    },
  });
}

export async function markReportReviewed(athleteId: string) {
  await requireOwner();
  await prisma.athlete.update({ where: { id: athleteId }, data: { lastReportReviewedAt: new Date() } });
  revalidatePath("/reports");
}
