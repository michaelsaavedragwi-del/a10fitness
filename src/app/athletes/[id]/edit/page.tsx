import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { updateAthlete } from "@/lib/actions/athletes";
import { SPORTS } from "@/lib/sports";

export default async function EditAthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { id } = await params;
  const { error } = await searchParams;
  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) notFound();

  const boundUpdate = updateAthlete.bind(null, athlete.id);

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Edit {athlete.name}</h1>
      </div>

      <form className="card" action={boundUpdate}>
        {error === "required" && <div className="auth-error">Name and sport are required.</div>}
        {error === "duplicate" && <div className="auth-error">An athlete with that name already exists.</div>}

        <div className="form-grid">
          <label>
            Full name
            <input type="text" name="name" defaultValue={athlete.name} required />
          </label>
          <label>
            Sport
            <select name="sport" defaultValue={athlete.sport} required>
              {!athlete.sport && (
                <option value="" disabled>
                  Select a sport
                </option>
              )}
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sex
            <select name="sex" defaultValue={athlete.sex ?? ""}>
              <option value="">Unspecified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label>
            Birth year
            <input
              type="number"
              step="1"
              name="birthYear"
              min={1900}
              max={new Date().getFullYear()}
              defaultValue={athlete.birthYear ?? ""}
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Manual predicted-value override
            <input type="number" step="any" name="predOverride" defaultValue={athlete.predOverride ?? ""} />
          </label>
        </div>

        <p className="hint">
          Force-plate PRs and performance PRs update automatically from test history — edit or
          delete a test entry on the profile page to correct them, rather than editing here.
        </p>

        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
    </main>
  );
}
