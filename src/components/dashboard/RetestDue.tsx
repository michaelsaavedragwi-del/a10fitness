import Link from "next/link";
import type { RosterAthlete } from "@/lib/roster";
import { formatDate } from "@/lib/format";
import { RETEST_WINDOW_DAYS } from "@/lib/roster";

export function RetestDue({ roster }: { roster: RosterAthlete[] }) {
  const overdue = roster
    .filter((a) => a.retestOverdueByDays !== null)
    .sort((a, b) => (b.retestOverdueByDays ?? 0) - (a.retestOverdueByDays ?? 0));

  if (overdue.length === 0) {
    return (
      <div className="empty-state">
        Nobody is past the {RETEST_WINDOW_DAYS}-day re-test window.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Athlete</th>
            <th>Last Force-Plate Test</th>
            <th>Days Since</th>
            <th>Overdue By</th>
          </tr>
        </thead>
        <tbody>
          {overdue.map((a) => (
            <tr key={a.id}>
              <td className="name-cell">
                <Link href={`/athletes/${a.id}`}>{a.name}</Link>
              </td>
              <td>{formatDate(a.lastForcePlateTestAt)}</td>
              <td className="num">{a.daysSinceLastTest}</td>
              <td className="num gap-orange">{a.retestOverdueByDays} days</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
