import type { TruStrengthTest } from "@prisma/client";
import { Sparkline } from "@/components/Sparkline";
import { formatDate, fmt1 } from "@/lib/format";
import { deleteTruStrengthTest } from "@/lib/actions/truStrengthTests";

type Direction = "higher" | "lower";

const METRIC_KEYS = [
  "peakForce",
  "avgForce",
  "netForce50",
  "netForce100",
  "netForce150",
  "netForce200",
  "netForce250",
  "peakRfd",
  "timeToPeakForce",
] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_META: Record<MetricKey, { label: string; unit: string; direction: Direction }> = {
  peakForce: { label: "Peak Force", unit: "N", direction: "higher" },
  avgForce: { label: "Avg Force", unit: "N", direction: "higher" },
  netForce50: { label: "Net Force @50ms", unit: "N", direction: "higher" },
  netForce100: { label: "Net Force @100ms", unit: "N", direction: "higher" },
  netForce150: { label: "Net Force @150ms", unit: "N", direction: "higher" },
  netForce200: { label: "Net Force @200ms", unit: "N", direction: "higher" },
  netForce250: { label: "Net Force @250ms", unit: "N", direction: "higher" },
  peakRfd: { label: "Peak RFD", unit: "N/s", direction: "higher" },
  timeToPeakForce: { label: "Time to Peak Force", unit: "s", direction: "lower" },
};

const DIRECTION_HINT: Record<Direction, string> = {
  higher: "higher is better",
  lower: "lower is better",
};

interface TestGroup {
  label: string;
  side: string | null;
  direction: string | null;
}

const GROUPS: TestGroup[] = [
  { label: "Left Internal Rotation", side: "Left", direction: "Internal" },
  { label: "Right Internal Rotation", side: "Right", direction: "Internal" },
  { label: "Left External Rotation", side: "Left", direction: "External" },
  { label: "Right External Rotation", side: "Right", direction: "External" },
];

export function TruStrengthPanel({
  athleteId,
  tests,
  isOwner,
}: {
  athleteId: string;
  tests: TruStrengthTest[];
  isOwner: boolean;
}) {
  if (tests.length === 0) {
    return (
      <div className="card">
        <h3>Tru Strength</h3>
        <div className="empty-state">No Tru Strength tests synced yet.</div>
      </div>
    );
  }

  // tests come in newest-first; groups need oldest-first for sparklines.
  const grouped = GROUPS.map((g) => ({
    ...g,
    tests: [...tests].reverse().filter((t) => t.side === g.side && t.direction === g.direction),
  })).filter((g) => g.tests.length > 0);

  const otherTests = [...tests].reverse().filter((t) => !GROUPS.some((g) => g.side === t.side && g.direction === t.direction));
  if (otherTests.length > 0) grouped.push({ label: "Other", side: null, direction: null, tests: otherTests });

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h3>Tru Strength</h3>
        <span className="hint">
          Shoulder internal/external rotation isometric strength — synced from Hawkin, held
          separately from force-plate readings.
        </span>
      </div>

      {grouped.map((g) => {
        const latest = g.tests[g.tests.length - 1];
        return (
          <div key={g.label} style={{ marginBottom: 16 }}>
            <h4 style={{ margin: "8px 0" }}>
              {g.label} <span className="hint">({g.tests.length} test{g.tests.length === 1 ? "" : "s"})</span>
            </h4>
            <div className="metric-grid">
              {METRIC_KEYS.map((key) => {
                const meta = METRIC_META[key];
                const series = g.tests.map((t) => t[key]);
                const value = latest[key];
                return (
                  <div className="metric-item card2" key={key}>
                    <div className="top-row">
                      <span className="metric-name">{meta.label}</span>
                      <span className="metric-value">
                        {(meta.unit === "s" ? value.toFixed(2) : fmt1(value))} {meta.unit}
                      </span>
                    </div>
                    <div className="sub-row">
                      <span>{DIRECTION_HINT[meta.direction]}</span>
                      <Sparkline values={series} width={70} height={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {isOwner && (
        <details>
          <summary className="hint" style={{ cursor: "pointer", padding: "4px 0" }}>
            Full test history ({tests.length})
          </summary>
          <div className="table-wrap" style={{ border: "none", marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Side</th>
                  <th>Direction</th>
                  <th>Mode</th>
                  <th>Peak Force (N)</th>
                  <th>Avg Force (N)</th>
                  <th>NF @50ms</th>
                  <th>NF @100ms</th>
                  <th>NF @150ms</th>
                  <th>NF @200ms</th>
                  <th>NF @250ms</th>
                  <th>Peak RFD (N/s)</th>
                  <th>Time to Peak (s)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.side ?? "—"}</td>
                    <td>{t.direction ?? "—"}</td>
                    <td>{t.mode}</td>
                    <td className="num">{fmt1(t.peakForce)}</td>
                    <td className="num">{fmt1(t.avgForce)}</td>
                    <td className="num">{fmt1(t.netForce50)}</td>
                    <td className="num">{fmt1(t.netForce100)}</td>
                    <td className="num">{fmt1(t.netForce150)}</td>
                    <td className="num">{fmt1(t.netForce200)}</td>
                    <td className="num">{fmt1(t.netForce250)}</td>
                    <td className="num">{fmt1(t.peakRfd)}</td>
                    <td className="num">{t.timeToPeakForce.toFixed(2)}</td>
                    <td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteTruStrengthTest(t.id, athleteId);
                        }}
                      >
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
