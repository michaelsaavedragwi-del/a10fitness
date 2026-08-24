import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { addTestEntry } from "@/lib/actions/athletes";
import { TestForm } from "@/components/athlete/TestForm";

export default async function NewTestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) notFound();

  const boundAdd = addTestEntry.bind(null, athlete.id);

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Add Test — {athlete.name}</h1>
      </div>
      <TestForm action={boundAdd} submitLabel="Add Test" />
    </main>
  );
}
