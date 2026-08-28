import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { updateAthlete } from "@/lib/actions/athletes";
import { JOINTS } from "@/lib/rom";
import { clubLocalDayKey } from "@/lib/timezone";

const LEVELS = ["Pro", "D1", "D2", "D3", "JUCO", "High School"];
const ISA_OPTIONS = ["None", "Narrow", "Wide"];

function romTemplate(): string {
  const tests: Record<string, unknown> = {};
  for (const j of JOINTS) {
    tests[j.key] = { l: 0, r: 0, flag: "good", note: "" };
  }
  return JSON.stringify({ date: clubLocalDayKey(new Date()), tests }, null, 2);
}

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
        {error === "required" && <div className="auth-error">Name and level are required.</div>}
        {error === "duplicate" && <div className="auth-error">An athlete with that name already exists.</div>}
        {error === "rom-json" && <div className="auth-error">Range-of-motion data isn&apos;t valid JSON.</div>}

        <div className="form-grid">
          <label>
            Full name
            <input type="text" name="name" defaultValue={athlete.name} required />
          </label>
          <label>
            Level
            <input type="text" name="level" list="levels" defaultValue={athlete.level} required />
            <datalist id="levels">
              {LEVELS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
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
          <label>
            Movement profile (ISA)
            <select name="isa" defaultValue={athlete.isa}>
              {ISA_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Range-of-motion assessment (JSON)
          <textarea
            name="rom"
            rows={10}
            placeholder={romTemplate()}
            style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            defaultValue={athlete.rom ? JSON.stringify(athlete.rom, null, 2) : ""}
          />
        </label>
        <p className="hint">
          Leave blank until you&apos;ve actually assessed the athlete — the placeholder above
          shows the expected shape. Joints: {JOINTS.map((j) => j.key).join(", ")}.{" "}
          <code>flag</code> is <code>good</code>, <code>warning</code>, or <code>red</code>, and
          only needs to be set on the worse side for a bilateral asymmetry.
        </p>

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
