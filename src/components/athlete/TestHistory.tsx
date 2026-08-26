import Link from "next/link";
import type { TestEntry } from "@prisma/client";
import { formatDate, fmt1 } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { deleteTestEntry } from "@/lib/actions/athletes";
import { groupTestsByDay } from "@/lib/day-grouping";

function EntryControls({ athleteId, entry, label }: { athleteId: string; entry: TestEntry; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {label && <span className="hint">{label}</span>}
      <Link href={`/athletes/${athleteId}/tests/${entry.id}/edit`} className="btn btn-ghost btn-sm">
        Edit
      </Link>
      <form
        action={async () => {
          "use server";
          await deleteTestEntry(entry.id, athleteId);
        }}
      >
        <button type="submit" className="btn btn-ghost btn-sm">
          Delete
        </button>
      </form>
    </div>
  );
}

export function TestHistory({
  athleteId,
  tests,
  isOwner,
}: {
  athleteId: string;
  tests: TestEntry[];
  isOwner: boolean;
}) {
  const chronological = [...tests].reverse();
  const ppSeries = chronological.map((t) => t.pp);
  const mphSeries = chronological.map((t) => t.mph);

  const groups = groupTestsByDay(tests).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Test History</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="hint">Peak Power</span>
            <Sparkline values={ppSeries} color="var(--lime)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="hint">Performance</span>
            <Sparkline values={mphSeries} color="var(--green)" />
          </div>
          {isOwner && (
            <Link href={`/athletes/${athleteId}/tests/new`} className="btn btn-primary btn-sm">
              Add Test
            </Link>
          )}
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="empty-state">No tests logged yet.</div>
      ) : (
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Peak Power</th>
                <th>Peak Power/BM</th>
                <th>Conc. Impulse</th>
                <th>Braking RFD</th>
                <th>mRSI</th>
                <th>Performance</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const fp = g.forcePlateEntry;
                const perf = g.performanceEntry;
                // Primary records shown inline: the day's chosen plate entry and
                // performance entry, deduplicated when the same row serves both.
                const primary = [fp, perf].filter((e, i, arr) => e !== null && arr.indexOf(e) === i) as TestEntry[];
                const extra = g.entries.filter((e) => !primary.includes(e));

                const typeLabel =
                  fp && perf && fp.id === perf.id
                    ? "Force Plate + Performance"
                    : fp && perf
                      ? "Force Plate + Performance"
                      : fp
                        ? "Force Plate"
                        : "Performance";

                return (
                  <tr key={g.dayKey}>
                    <td>{formatDate(g.date)}</td>
                    <td>
                      <span className={`tag ${fp ? "lime" : "green"}`}>{typeLabel}</span>
                    </td>
                    <td className="num">{fp && fp.pp > 0 ? fmt1(fp.pp) : "—"}</td>
                    <td className="num">{fp && fp.ppbm > 0 ? fmt1(fp.ppbm) : "—"}</td>
                    <td className="num">{fp && fp.ci > 0 ? fmt1(fp.ci) : "—"}</td>
                    <td className="num">{fp && fp.brfd > 0 ? fmt1(fp.brfd) : "—"}</td>
                    <td className="num">{fp && fp.mrsi > 0 ? fmt1(fp.mrsi) : "—"}</td>
                    <td className="num">{perf && perf.mph > 0 ? fmt1(perf.mph) : "—"}</td>
                    {isOwner && (
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {primary.map((e) => (
                            <EntryControls
                              key={e.id}
                              athleteId={athleteId}
                              entry={e}
                              label={primary.length > 1 ? (e.isForcePlate ? "Plate" : "Perf") : undefined}
                            />
                          ))}
                          {extra.length > 0 && (
                            <details>
                              <summary className="hint" style={{ cursor: "pointer" }}>
                                +{extra.length} more this day
                              </summary>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                                {extra.map((e) => (
                                  <EntryControls
                                    key={e.id}
                                    athleteId={athleteId}
                                    entry={e}
                                    label={e.isForcePlate ? `Plate ${fmt1(e.pp)}W` : `Perf ${fmt1(e.mph)}`}
                                  />
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
