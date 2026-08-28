import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/roster";

function Board({ title, unit, entries }: { title: string; unit: string; entries: LeaderboardEntry[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <div className="empty-state">No measurements yet.</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20, color: "var(--text-sec)" }}>
          {entries.slice(0, 10).map((e, i) => (
            <li key={e.athleteId} style={{ padding: "4px 0" }}>
              <Link href={`/athletes/${e.athleteId}`}>{e.athleteName}</Link>{" "}
              <span className="hint">({e.sport || "—"})</span> —{" "}
              <span className="tabular" style={{ fontWeight: 600, color: "var(--text-pri)" }}>
                {e.value.toFixed(1)} {unit}
              </span>
              {i === 0 && " 🏆"}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Leaderboards({
  performance,
  power,
}: {
  performance: LeaderboardEntry[];
  power: LeaderboardEntry[];
}) {
  return (
    <div className="priority-columns" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
      <Board title="Leaderboard — Performance" unit="mph" entries={performance} />
      <Board title="Leaderboard — Peak Power" unit="W" entries={power} />
    </div>
  );
}
