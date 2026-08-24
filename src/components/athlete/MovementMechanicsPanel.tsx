import type { TestEntry } from "@prisma/client";
import { Sparkline } from "@/components/Sparkline";
import { EXTENDED_METRIC_KEYS, type ExtendedMetricKey } from "@/lib/hawkin/mapping";

type Direction = "higher" | "lower" | "symmetry";

const METRIC_META: Record<ExtendedMetricKey, { label: string; unit: string; direction: Direction; group: string }> = {
  peakLandingForce: { label: "Peak Landing Force", unit: "N", direction: "lower", group: "Landing" },
  timeToStabilization: { label: "Time to Stabilization", unit: "ms", direction: "lower", group: "Landing" },
  landingPerformanceIndex: { label: "Landing Performance Index", unit: "", direction: "higher", group: "Landing" },
  lrBrakingImpulseIndex: { label: "L|R Braking Impulse Index", unit: "%", direction: "symmetry", group: "Asymmetry" },
  lrPropulsiveImpulseIndex: { label: "L|R Propulsive Impulse Index", unit: "%", direction: "symmetry", group: "Asymmetry" },
  lrLandingImpulseIndex: { label: "L|R Landing Impulse Index", unit: "%", direction: "symmetry", group: "Asymmetry" },
  propulsivePhase: { label: "Propulsive Phase Duration", unit: "s", direction: "lower", group: "Phase & Velocity" },
  takeoffVelocity: { label: "Takeoff Velocity", unit: "m/s", direction: "higher", group: "Phase & Velocity" },
  peakVelocity: { label: "Peak Velocity", unit: "m/s", direction: "higher", group: "Phase & Velocity" },
};

const DIRECTION_HINT: Record<Direction, string> = {
  higher: "higher is better",
  lower: "lower is better",
  symmetry: "closer to 0 is better",
};

const GROUPS = ["Landing", "Asymmetry", "Phase & Velocity"];

export function MovementMechanicsPanel({ tests }: { tests: TestEntry[] }) {
  const latest = tests[0]; // tests are ordered newest-first
  if (!latest) {
    return (
      <div className="card">
        <h3>Movement Mechanics</h3>
        <div className="empty-state">No force-plate tests yet.</div>
      </div>
    );
  }

  const chronological = [...tests].reverse();

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h3>Movement Mechanics</h3>
        <span className="hint">
          Latest test only — not tracked as a PR, not part of the prediction model.
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "8px 0" }}>{group}</h4>
          <div className="metric-grid">
            {(Object.keys(EXTENDED_METRIC_KEYS) as ExtendedMetricKey[])
              .filter((key) => METRIC_META[key].group === group)
              .map((key) => {
                const meta = METRIC_META[key];
                const value = latest[key];
                const measured = value !== 0;
                const series = chronological.map((t) => t[key]);
                return (
                  <div className="metric-item card2" key={key}>
                    <div className="top-row">
                      <span className="metric-name">{meta.label}</span>
                      <span className="metric-value">
                        {measured ? `${value.toFixed(meta.unit === "s" ? 2 : 1)} ${meta.unit}`.trim() : "—"}
                      </span>
                    </div>
                    <div className="sub-row">
                      <span>{DIRECTION_HINT[meta.direction]}</span>
                      {measured && <Sparkline values={series.map((v) => Math.abs(v))} width={70} height={20} />}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
