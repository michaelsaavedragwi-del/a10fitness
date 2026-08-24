import type { ComputedAthlete } from "@/lib/prediction";
import { METRIC_KEYS } from "@/lib/prediction";
import { METRIC_LABELS, METRIC_UNITS, fmt1 } from "@/lib/format";

export function MetricGrid({ athlete }: { athlete: ComputedAthlete }) {
  return (
    <div className="metric-grid">
      {METRIC_KEYS.filter((k) => k !== "mph").map((key) => {
        const s = athlete.standings[key];
        const measured = s.value > 0;
        return (
          <div className="metric-item card2" key={key}>
            <div className="top-row">
              <span className="metric-name">{METRIC_LABELS[key]}</span>
              <span className="metric-value">
                {measured ? `${fmt1(s.value)} ${METRIC_UNITS[key]}`.trim() : "—"}
              </span>
            </div>
            {measured ? (
              <>
                <div className={`pct-bar ${s.bottomQuartile ? "flagged" : ""}`}>
                  <div style={{ width: `${s.percentile ?? 0}%` }} />
                </div>
                <div className="sub-row">
                  <span>
                    Rank {s.rank}/{s.total}
                  </span>
                  <span>{s.percentile}th percentile</span>
                </div>
                {s.bottomQuartile && <div className="sub-row"><span className="tag red">Bottom quartile</span></div>}
              </>
            ) : (
              <div className="sub-row">
                <span>Not measured yet</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
