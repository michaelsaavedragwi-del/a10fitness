import type { TestEntry } from "@prisma/client";
import { clubLocalDayKey } from "@/lib/timezone";

function toDateInputValue(d: Date): string {
  return clubLocalDayKey(d);
}

export function TestForm({
  action,
  existing,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  existing?: TestEntry;
  submitLabel: string;
}) {
  return (
    <form className="card" action={action}>
      <div className="form-grid">
        <label>
          Test date
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInputValue(existing?.date ?? new Date())}
          />
        </label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="isForcePlate" defaultChecked={existing?.isForcePlate ?? true} style={{ width: "auto" }} />
          Force-plate (CMJ) test
        </label>
      </div>

      <h3>Force-Plate Metrics</h3>
      <p className="hint">Leave blank / zero for a performance-only entry.</p>
      <div className="form-grid">
        <label>
          Peak Power (W)
          <input type="number" step="any" name="pp" min={0} defaultValue={existing?.pp || ""} />
        </label>
        <label>
          Peak Power / BM (W/kg)
          <input type="number" step="any" name="ppbm" min={0} defaultValue={existing?.ppbm || ""} />
        </label>
        <label>
          Concentric Impulse (N·s)
          <input type="number" step="any" name="ci" min={0} defaultValue={existing?.ci || ""} />
        </label>
        <label>
          Braking RFD (N/s)
          <input type="number" step="any" name="brfd" min={0} defaultValue={existing?.brfd || ""} />
        </label>
        <label>
          mRSI
          <input type="number" step="any" name="mrsi" min={0} defaultValue={existing?.mrsi || ""} />
        </label>
      </div>

      <h3>Performance</h3>
      <div className="form-grid">
        <label>
          Measured performance value
          <input type="number" step="any" name="mph" min={0} defaultValue={existing?.mph || ""} />
        </label>
      </div>

      <h3>Movement Mechanics (optional)</h3>
      <p className="hint">
        Display-only — not tracked as a PR and not used by the prediction model.
      </p>
      <div className="form-grid">
        <label>
          Peak Landing Force (N)
          <input type="number" step="any" name="peakLandingForce" defaultValue={existing?.peakLandingForce || ""} />
        </label>
        <label>
          Time to Stabilization (ms)
          <input type="number" step="any" name="timeToStabilization" defaultValue={existing?.timeToStabilization || ""} />
        </label>
        <label>
          Landing Performance Index
          <input type="number" step="any" name="landingPerformanceIndex" defaultValue={existing?.landingPerformanceIndex || ""} />
        </label>
        <label>
          L|R Braking Impulse Index (%)
          <input type="number" step="any" name="lrBrakingImpulseIndex" defaultValue={existing?.lrBrakingImpulseIndex || ""} />
        </label>
        <label>
          L|R Propulsive Impulse Index (%)
          <input type="number" step="any" name="lrPropulsiveImpulseIndex" defaultValue={existing?.lrPropulsiveImpulseIndex || ""} />
        </label>
        <label>
          L|R Landing Impulse Index (%)
          <input type="number" step="any" name="lrLandingImpulseIndex" defaultValue={existing?.lrLandingImpulseIndex || ""} />
        </label>
        <label>
          Propulsive Phase Duration (s)
          <input type="number" step="any" name="propulsivePhase" min={0} defaultValue={existing?.propulsivePhase || ""} />
        </label>
        <label>
          Takeoff Velocity (m/s)
          <input type="number" step="any" name="takeoffVelocity" min={0} defaultValue={existing?.takeoffVelocity || ""} />
        </label>
        <label>
          Peak Velocity (m/s)
          <input type="number" step="any" name="peakVelocity" min={0} defaultValue={existing?.peakVelocity || ""} />
        </label>
      </div>

      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
