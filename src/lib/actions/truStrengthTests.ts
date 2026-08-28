"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function deleteTruStrengthTest(testId: string, athleteId: string) {
  await requireOwner();
  await prisma.truStrengthTest.delete({ where: { id: testId } });
  revalidatePath(`/athletes/${athleteId}`);
}
