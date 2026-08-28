import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { getReportsList, REPORT_REVIEW_WINDOW_DAYS } from "@/lib/roster";
import { markReportReviewed } from "@/lib/actions/athletes";
import { categoryLabel, formatDate, fmtSigned1 } from "@/lib/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const isOwner = user.role === "owner";
  const { q } = await searchParams;

  const items = await getReportsList();
  const filtered = q ? items.filter((a) => a.name.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <main className="page">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      <form className="filters" method="get">
        <label>
          Search
          <input type="text" name="q" placeholder="Athlete name" defaultValue={q ?? ""} />
        </label>
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
      </form>

      <p className="hint" style={{ marginBottom: 12 }}>
        Sorted worst gap first — already in the order you&apos;d work through it. Review cadence:{" "}
        {REPORT_REVIEW_WINDOW_DAYS} days.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Sport</th>
              <th>Status</th>
              <th>Gap</th>
              <th>Last Reviewed</th>
              <th></th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="name-cell">
                  <Link href={`/athletes/${a.id}`}>{a.name}</Link>
                </td>
                <td>{a.sport || "—"}</td>
                <td>
                  <span className={`badge ${a.category.replace(" ", "-")}`}>{categoryLabel(a.category)}</span>
                </td>
                <td className="num">{fmtSigned1(a.gap)}</td>
                <td>
                  {a.everReviewed ? (
                    formatDate(a.lastReportReviewedAt)
                  ) : (
                    <span className="tag orange">Never reviewed</span>
                  )}
                  {a.reviewOverdueByDays !== null && (
                    <>
                      {" "}
                      <span className="tag orange">{a.reviewOverdueByDays}d overdue</span>
                    </>
                  )}
                </td>
                <td>
                  <Link href={`/athletes/${a.id}/report`} className="btn btn-ghost btn-sm">
                    Open Report
                  </Link>
                </td>
                {isOwner && (
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await markReportReviewed(a.id);
                      }}
                    >
                      <button type="submit" className="btn btn-sm">
                        Mark Reviewed
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="empty-state">
                  No athletes match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
