"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { importMatchedTest, type PreviewMatchedTest } from "@/lib/hawkin/sync";

export async function importSelectedTests(tests: PreviewMatchedTest[]) {
  await requireOwner();

  let imported = 0;
  let duplicates = 0;
  for (const test of tests) {
    const result = await importMatchedTest(test);
    if (result === "imported") imported++;
    else duplicates++;
  }

  revalidatePath("/");
  revalidatePath("/sync");
  return { imported, duplicates };
}

export async function dismissUnmatchedTest(testId: string, profileName: string) {
  await requireOwner();
  await prisma.dismissedTest.upsert({
    where: { externalTestId: testId },
    create: { externalTestId: testId, profileName },
    update: {},
  });
  revalidatePath("/sync");
}
