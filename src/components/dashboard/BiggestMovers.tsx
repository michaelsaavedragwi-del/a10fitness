import Link from "next/link";
import type { Mover } from "@/lib/roster";
import { formatDate } from "@/lib/format";

function MoverList({ title, unit, movers }: { title: string; unit: string; movers: Mover[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {movers.length === 0 ? (
        <div className="empty-state">No gains between consecutive tests yet.</div>
      ) : (
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Athlete</th>
                <th>Gain</th>
                <th>From → To</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {movers.map((m) => (
                <tr key={m.athleteId}>
                  <td className="name-cell">
                    <Link href={`/athletes/${m.athleteId}`}>{m.athleteName}</Link>
                  </td>
                  <td className="num gap-green">
                    +{m.delta.toFixed(1)} {unit}
                  </td>
                  <td className="num">
                    {m.from.toFixed(1)} → {m.to.toFixed(1)}
                  </td>
                  <td className="hint">
                    {formatDate(m.fromDate)} → {formatDate(m.toDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BiggestMovers({ power, performance }: { power: Mover[]; performance: Mover[] }) {
  return (
    <div className="priority-columns" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))" }}>
      <MoverList title="Biggest Movers — Peak Power" unit="W" movers={power} />
      <MoverList title="Biggest Movers — Performance" unit="mph" movers={performance} />
    </div>
  );
}
