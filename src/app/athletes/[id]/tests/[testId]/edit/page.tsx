import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { updateTestEntry } from "@/lib/actions/athletes";
import { TestForm } from "@/components/athlete/TestForm";

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  await requireOwner();
  const { id, testId } = await params;
  const [athlete, test] = await Promise.all([
    prisma.athlete.findUnique({ where: { id } }),
    prisma.testEntry.findUnique({ where: { id: testId } }),
  ]);
  if (!athlete || !test || test.athleteId !== athlete.id) notFound();

  const boundUpdate = updateTestEntry.bind(null, test.id, athlete.id);

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Edit Test — {athlete.name}</h1>
      </div>
      <TestForm action={boundUpdate} existing={test} submitLabel="Save Changes" />
    </main>
  );
}
