import type { TestEntry } from "@prisma/client";
import { formatDate } from "@/lib/format";

export function ProgressChart({ tests }: { tests: TestEntry[] }) {
  const ppPoints = tests.filter((t) => t.pp > 0);
  const mphPoints = tests.filter((t) => t.mph > 0);

  if (ppPoints.length < 2 && mphPoints.length < 2) {
    return <div className="empty-state">Not enough tests yet to chart a trend.</div>;
  }

  const width = 640;
  const height = 220;
  const pad = 36;

  const allDates = [...ppPoints, ...mphPoints].map((t) => t.date.getTime());
  const xMin = Math.min(...allDates);
  const xMax = Math.max(...allDates);
  const xRange = xMax - xMin || 1;
  const sx = (t: number) => pad + ((t - xMin) / xRange) * (width - 2 * pad);

  function scaleY(points: TestEntry[], key: "pp" | "mph") {
    const values = points.map((p) => p[key]);
    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values) * 1.1;
    const range = max - min || 1;
    return (v: number) => height - pad - ((v - min) / range) * (height - 2 * pad);
  }

  const syPp = scaleY(ppPoints, "pp");
  const syMph = scaleY(mphPoints, "mph");

  function line(points: TestEntry[], key: "pp" | "mph", sy: (v: number) => number) {
    return points.map((p) => `${sx(p.date.getTime()).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(" ");
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width }}>
        <rect x={0} y={0} width={width} height={height} fill="var(--card2)" rx={8} />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--text-mute)" />

        {ppPoints.length >= 2 && (
          <polyline points={line(ppPoints, "pp", syPp)} fill="none" stroke="var(--lime)" strokeWidth={2} />
        )}
        {ppPoints.map((p, i) => (
          <g key={`pp-${p.id}`}>
            <circle cx={sx(p.date.getTime())} cy={syPp(p.pp)} r={3} fill="var(--lime)" />
            {(i === 0 || i === ppPoints.length - 1) && (
              <text x={sx(p.date.getTime())} y={syPp(p.pp) - 8} fontSize="10" fill="var(--lime)" textAnchor="middle">
                {p.pp.toFixed(0)}W
              </text>
            )}
          </g>
        ))}

        {mphPoints.length >= 2 && (
          <polyline points={line(mphPoints, "mph", syMph)} fill="none" stroke="var(--green)" strokeWidth={2} />
        )}
        {mphPoints.map((p, i) => (
          <g key={`mph-${p.id}`}>
            <circle cx={sx(p.date.getTime())} cy={syMph(p.mph)} r={3} fill="var(--green)" />
            {(i === 0 || i === mphPoints.length - 1) && (
              <text x={sx(p.date.getTime())} y={syMph(p.mph) + 16} fontSize="10" fill="var(--green)" textAnchor="middle">
                {p.mph.toFixed(1)}
              </text>
            )}
          </g>
        ))}

        <text x={pad} y={height - 8} fontSize="10" fill="var(--text-mute)">
          {formatDate(new Date(xMin))}
        </text>
        <text x={width - pad} y={height - 8} fontSize="10" fill="var(--text-mute)" textAnchor="end">
          {formatDate(new Date(xMax))}
        </text>
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
        <span className="hint">
          <span style={{ color: "var(--lime)" }}>●</span> Peak Power
        </span>
        <span className="hint">
          <span style={{ color: "var(--green)" }}>●</span> Performance
        </span>
      </div>
    </div>
  );
}
