import Link from "next/link";
import type { ActivityItem } from "@/lib/activity";
import { fmtSigned1 } from "@/lib/format";

function describeWhatHappened(item: ActivityItem): string {
  const parts: string[] = [];
  if (item.pp !== null) parts.push("Force-plate test");
  if (item.mph !== null) parts.push("Performance logged");
  return parts.join(" + ") || "Entry logged";
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="empty-state">No activity in the last 30 days.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Athlete</th>
            <th>What happened</th>
            <th>When</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.athleteId}-${item.date.toISOString()}`}>
              <td className="name-cell">
                <Link href={`/athletes/${item.athleteId}`}>{item.athleteName}</Link>
              </td>
              <td>{describeWhatHappened(item)}</td>
              <td>{item.dayLabel}</td>
              <td>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {item.pp !== null && (
                    <span className={item.ppIsPr ? "tag green" : "hint"}>
                      {item.ppIsPr && "PR · "}PP {item.ppDelta !== null ? fmtSigned1(item.ppDelta) : item.pp.toFixed(1)}
                      {item.ppDelta === null ? " W" : ""}
                    </span>
                  )}
                  {item.mph !== null && (
                    <span className={item.mphIsPr ? "tag green" : "hint"}>
                      {item.mphIsPr && "PR · "}Perf {item.mphDelta !== null ? fmtSigned1(item.mphDelta) : item.mph.toFixed(1)}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
