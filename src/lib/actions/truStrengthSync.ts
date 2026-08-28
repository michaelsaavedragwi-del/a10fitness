"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  createTruStrengthAthleteAndImport,
  importMatchedTruStrengthTest,
  type PreviewMatchedTruStrengthTest,
  type PreviewUnmatchedTruStrengthTest,
} from "@/lib/hawkin/truStrengthSync";

export async function importSelectedTruStrengthTests(tests: PreviewMatchedTruStrengthTest[]) {
  await requireOwner();

  let imported = 0;
  let duplicates = 0;
  for (const test of tests) {
    const result = await importMatchedTruStrengthTest(test);
    if (result === "imported") imported++;
    else duplicates++;
  }

  revalidatePath("/");
  revalidatePath("/sync");
  return { imported, duplicates };
}

export async function dismissUnmatchedTruStrengthTest(testId: string, profileName: string) {
  await requireOwner();
  await prisma.dismissedTest.upsert({
    where: { externalTestId: testId },
    create: { externalTestId: testId, profileName },
    update: {},
  });
  revalidatePath("/sync");
}

export async function createAndImportUnmatchedTruStrength(tests: PreviewUnmatchedTruStrengthTest[]) {
  await requireOwner();

  let created = 0;
  let duplicates = 0;
  const failures: string[] = [];

  for (const test of tests) {
    try {
      const { result } = await createTruStrengthAthleteAndImport(test);
      if (result === "imported") created++;
      else duplicates++;
    } catch (err) {
      failures.push(`${test.profileName}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/sync");
  revalidatePath("/roster");
  return { created, duplicates, failures };
}
