import Link from "next/link";
import type { RosterAthlete } from "@/lib/roster";

export function AwaitingData({ roster }: { roster: RosterAthlete[] }) {
  const waiting = roster.filter((a) => a.category === "awaiting data");
  if (waiting.length === 0) {
    return <div className="empty-state">Everyone on the roster has at least one force-plate test.</div>;
  }
  return (
    <div className="priority-columns" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))" }}>
      {waiting.map((a) => (
        <Link key={a.id} href={`/athletes/${a.id}`} className="athlete-card">
          <div className="row1">
            <span className="name">{a.name}</span>
          </div>
          <div className="level">{a.sport || "—"}</div>
          <div className="hint">
            {a.mph > 0 ? `Performance: ${a.mph.toFixed(1)}` : "No performance measured yet"}
          </div>
        </Link>
      ))}
    </div>
  );
}
