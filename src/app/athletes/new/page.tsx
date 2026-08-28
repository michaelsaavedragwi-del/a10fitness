import { requireOwner } from "@/lib/auth-helpers";
import { createAthlete } from "@/lib/actions/athletes";

const LEVELS = ["Pro", "D1", "D2", "D3", "JUCO", "High School"];

export default async function NewAthletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Add Athlete</h1>
      </div>

      <form className="card" action={createAthlete}>
        {error === "required" && <div className="auth-error">Name and level are required.</div>}
        {error === "duplicate" && <div className="auth-error">An athlete with that name already exists.</div>}

        <div className="form-grid">
          <label>
            Full name
            <input type="text" name="name" required autoFocus />
          </label>
          <label>
            Level
            <input type="text" name="level" list="levels" required />
            <datalist id="levels">
              {LEVELS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
          <label>
            Sex
            <select name="sex" defaultValue="">
              <option value="">Unspecified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label>
            Birth year
            <input type="number" step="1" name="birthYear" min={1900} max={new Date().getFullYear()} />
          </label>
        </div>

        <p className="hint">
          Force-plate metrics are optional — an athlete can be added with just a level and a
          performance value, and held out of the prediction model until their first real test
          arrives.
        </p>

        <h3>Force-Plate Metrics (optional)</h3>
        <div className="form-grid">
          <label>
            Peak Power (W)
            <input type="number" step="any" name="pp" min={0} />
          </label>
          <label>
            Peak Power / BM (W/kg)
            <input type="number" step="any" name="ppbm" min={0} />
          </label>
          <label>
            Concentric Impulse (N·s)
            <input type="number" step="any" name="ci" min={0} />
          </label>
          <label>
            Braking RFD (N/s)
            <input type="number" step="any" name="brfd" min={0} />
          </label>
          <label>
            mRSI
            <input type="number" step="any" name="mrsi" min={0} />
          </label>
        </div>

        <h3>Performance</h3>
        <div className="form-grid">
          <label>
            Measured performance value
            <input type="number" step="any" name="mph" min={0} />
          </label>
        </div>

        <button type="submit" className="btn btn-primary">
          Add Athlete
        </button>
      </form>
    </main>
  );
}
