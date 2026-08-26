import type { RosterAthlete } from "@/lib/roster";
import { categoryColor } from "@/lib/format";

const COLOR_HEX: Record<string, string> = {
  red: "var(--red)",
  orange: "var(--orange)",
  green: "var(--green)",
  neutral: "var(--lime)",
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function QuadrantChart({ roster }: { roster: RosterAthlete[] }) {
  const plottable = roster.filter((a) => a.pp > 0 && a.mph > 0);

  if (plottable.length < 2) {
    return <div className="empty-state">Need at least 2 athletes with both power and performance data to plot.</div>;
  }

  const xs = plottable.map((a) => a.pp);
  const ys = plottable.map((a) => a.mph);
  const medX = median(xs);
  const medY = median(ys);

  const pad = 40;
  const width = 640;
  const height = 400;
  const xMin = Math.min(...xs) * 0.95;
  const xMax = Math.max(...xs) * 1.05;
  const yMin = Math.min(...ys) * 0.95;
  const yMax = Math.max(...ys) * 1.05;

  const sx = (v: number) => pad + ((v - xMin) / (xMax - xMin)) * (width - 2 * pad);
  const sy = (v: number) => height - pad - ((v - yMin) / (yMax - yMin)) * (height - 2 * pad);

  return (
    <div className="quadrant-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 640 }} role="img" aria-label="Power vs velocity quadrant chart">
        <rect x={0} y={0} width={width} height={height} fill="var(--card2)" rx={8} />

        {/* quadrant divider lines at medians */}
        <line x1={sx(medX)} y1={pad} x2={sx(medX)} y2={height - pad} stroke="var(--border)" strokeDasharray="4 4" />
        <line x1={pad} y1={sy(medY)} x2={width - pad} y2={sy(medY)} stroke="var(--border)" strokeDasharray="4 4" />

        {/* quadrant labels */}
        <text x={width - pad - 6} y={pad + 16} textAnchor="end" fontSize="11" fill="var(--text-mute)">maintain</text>
        <text x={pad + 6} y={pad + 16} textAnchor="start" fontSize="11" fill="var(--text-mute)">train the skill</text>
        <text x={width - pad - 6} y={height - pad - 8} textAnchor="end" fontSize="11" fill="var(--text-mute)">build the engine</text>
        <text x={pad + 6} y={height - pad - 8} textAnchor="start" fontSize="11" fill="var(--text-mute)">build both</text>

        {/* axes */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--text-mute)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--text-mute)" />
        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-mute)">
          Peak Power (W) — engine
        </text>
        <text x={12} y={height / 2} textAnchor="middle" fontSize="11" fill="var(--text-mute)" transform={`rotate(-90 12 ${height / 2})`}>
          Performance — expression
        </text>

        {plottable.map((a) => (
          <a key={a.id} href={`/athletes/${a.id}`}>
            <circle cx={sx(a.pp)} cy={sy(a.mph)} r={6} fill={COLOR_HEX[categoryColor(a.category)]} stroke="var(--bg)" strokeWidth={1}>
              <title>{`${a.name} — PP ${a.pp.toFixed(0)}W, Perf ${a.mph.toFixed(1)}`}</title>
            </circle>
          </a>
        ))}
      </svg>

      <div className="quadrant-legend">
        <div>
          <span className="dot" style={{ background: "var(--red)" }} />
          High priority
        </div>
        <div>
          <span className="dot" style={{ background: "var(--orange)" }} />
          Moderate
        </div>
        <div>
          <span className="dot" style={{ background: "var(--lime)" }} />
          On track / other
        </div>
        <div>
          <span className="dot" style={{ background: "var(--green)" }} />
          Overperforming
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Split at roster medians. Hover a dot for the athlete, click to open their profile.
        </p>
      </div>
    </div>
  );
}
