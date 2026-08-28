import type { TestEntry } from "@prisma/client";
import { Sparkline } from "@/components/Sparkline";

const ASYMMETRY_KEYS = ["lrBrakingImpulseIndex", "lrPropulsiveImpulseIndex", "lrLandingImpulseIndex"] as const;
type AsymmetryKey = (typeof ASYMMETRY_KEYS)[number];

const METRIC_LABELS: Record<AsymmetryKey, string> = {
  lrBrakingImpulseIndex: "L|R Braking Impulse Index",
  lrPropulsiveImpulseIndex: "L|R Propulsive Impulse Index",
  lrLandingImpulseIndex: "L|R Landing Impulse Index",
};

export function AsymmetryPanel({ tests }: { tests: TestEntry[] }) {
  const latest = tests[0]; // tests are ordered newest-first
  if (!latest) {
    return (
      <div className="card">
        <h3>L/R Asymmetry</h3>
        <div className="empty-state">No force-plate tests yet.</div>
      </div>
    );
  }

  const chronological = [...tests].reverse();

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h3>L/R Asymmetry</h3>
        <span className="hint">Latest test only — closer to 0% is better.</span>
      </div>

      <div className="metric-grid">
        {ASYMMETRY_KEYS.map((key) => {
          const value = latest[key];
          const measured = value !== 0;
          const series = chronological.map((t) => t[key]);
          return (
            <div className="metric-item card2" key={key}>
              <div className="top-row">
                <span className="metric-name">{METRIC_LABELS[key]}</span>
                <span className="metric-value">{measured ? `${value.toFixed(1)}%` : "—"}</span>
              </div>
              <div className="sub-row">
                <span>closer to 0 is better</span>
                {measured && <Sparkline values={series.map((v) => Math.abs(v))} width={70} height={20} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
