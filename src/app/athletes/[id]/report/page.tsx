import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getAthleteProfile } from "@/lib/roster";
import { METRIC_KEYS } from "@/lib/prediction";
import { METRIC_LABELS, METRIC_UNITS, fmt1, fmtSignedPercent, formatDate } from "@/lib/format";
import { ProgressChart } from "@/components/athlete/ProgressChart";
import { Sparkline } from "@/components/Sparkline";
import { IsaProfile } from "@/components/athlete/IsaProfile";
import { PrintButton } from "@/components/PrintButton";

export default async function AthleteReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const profile = await getAthleteProfile(id);
  if (!profile) notFound();

  const { athlete, computed, tests } = profile; // tests: newest first
  const chronological = [...tests].reverse(); // oldest first

  // "Current" means the LATEST test, never the stored PR — a PR can't go
  // down, so an athlete whose numbers are falling would otherwise read "+0%"
  // next to a downward-sloping trend. The one exception is the performance
  // metric itself, which keeps showing the athlete's best (PRs still drive
  // the prediction model; they just aren't what "current" means on this report).
  const latestFpTest = tests.find((t) => t.isForcePlate && t.pp > 0) ?? null;
  const baselineFpTest = chronological.find((t) => t.isForcePlate && t.pp > 0) ?? null;
  const baselineMphTest = chronological.find((t) => t.mph > 0) ?? null;

  const thinData = tests.length < 2;

  return (
    <main className="page" style={{ maxWidth: 800 }}>
      <div className="page-header no-print">
        <h1>Progress Report</h1>
        <div className="actions">
          <a href={`/athletes/${id}/report/pdf`} className="btn" download>
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="card">
        <h1 style={{ marginBottom: 2 }}>{athlete.name}</h1>
        <p className="hint">
          {athlete.level} · Report generated {formatDate(new Date())}
        </p>

        <div className="pred-panel" style={{ marginTop: 16 }}>
          <div className="pred-stat">
            <div className="label">Performance (Best)</div>
            <div className="value">{athlete.mph > 0 ? fmt1(athlete.mph) : "—"}</div>
            <div className="hint">
              {baselineMphTest ? `${fmtSignedPercent(athlete.mph, baselineMphTest.mph)} since baseline` : "no baseline yet"}
            </div>
          </div>
          <div className="pred-stat">
            <div className="label">Peak Power (Current)</div>
            <div className="value">{latestFpTest ? fmt1(latestFpTest.pp) : "—"}</div>
            <div className="hint">
              {baselineFpTest && latestFpTest
                ? `${fmtSignedPercent(latestFpTest.pp, baselineFpTest.pp)} since baseline`
                : "no baseline yet"}
            </div>
          </div>
        </div>
      </div>

      <section className="block">
        <h2>Progress Over Time</h2>
        <div className="card">
          {thinData ? (
            <div className="empty-state">Not enough tests yet — only one test on file so far.</div>
          ) : (
            <ProgressChart tests={chronological} />
          )}
        </div>
      </section>

      <section className="block">
        <h2>Force-Plate Progress</h2>
        <p className="hint" style={{ marginBottom: 8 }}>
          &quot;Current&quot; is the latest test, not the stored best — so a decline shows up here even though it can&apos;t move the PR.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current</th>
                <th>Change Since Baseline</th>
                <th>Rank</th>
                <th>Percentile</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_KEYS.filter((k) => k !== "mph").map((key) => {
                const s = computed.standings[key];
                const series = chronological.map((t) => t[key]);
                const currentValue = latestFpTest ? latestFpTest[key] : 0;
                const baselineValue = baselineFpTest ? baselineFpTest[key] : 0;
                return (
                  <tr key={key}>
                    <td className="name-cell">{METRIC_LABELS[key]}</td>
                    <td className="num">{currentValue > 0 ? `${fmt1(currentValue)} ${METRIC_UNITS[key]}`.trim() : "—"}</td>
                    <td className="num">{fmtSignedPercent(currentValue, baselineValue)}</td>
                    <td className="num">{s.rank ? `${s.rank}/${s.total}` : "—"}</td>
                    <td className="num">{s.percentile !== null ? `${s.percentile}th` : "—"}</td>
                    <td>
                      <Sparkline values={series} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="block">
        <IsaProfile isa={athlete.isa} />
      </section>
    </main>
  );
}
