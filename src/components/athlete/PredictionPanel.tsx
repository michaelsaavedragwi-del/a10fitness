import type { ComputedAthlete } from "@/lib/prediction";
import { categoryColor, categoryLabel, fmt1, fmtSigned1 } from "@/lib/format";

export function PredictionPanel({ athlete }: { athlete: ComputedAthlete }) {
  const color = categoryColor(athlete.category);

  return (
    <div className="card">
      <div className="pred-panel">
        <div className="pred-stat">
          <div className="label">Actual</div>
          <div className="value">{athlete.hasPerformance ? fmt1(athlete.mph) : "—"}</div>
        </div>
        <div className="pred-stat">
          <div className="label">Predicted</div>
          <div className="value">{fmt1(athlete.pred)}</div>
        </div>
        <div className="pred-stat">
          <div className="label">Gap</div>
          <div className={`value ${color}`}>{fmtSigned1(athlete.gap)}</div>
        </div>
      </div>
      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span className={`badge ${athlete.category.replace(" ", "-")}`}>{categoryLabel(athlete.category)}</span>
        <span className="hint">
          {athlete.isManualOverride
            ? "Prediction set manually by a coach — overrides the model."
            : athlete.pred === null
              ? "No model prediction available."
              : `Regression model${athlete.modelOffset !== null ? `, level-recentering offset ${fmtSigned1(athlete.modelOffset)}` : ""}.`}
        </span>
      </div>
    </div>
  );
}
