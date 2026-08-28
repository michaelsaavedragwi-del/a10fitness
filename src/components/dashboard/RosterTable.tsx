import Link from "next/link";
import type { RosterAthlete } from "@/lib/roster";
import { ageFromBirthYear, categoryLabel, fmt1, fmtSigned1 } from "@/lib/format";

export interface RosterFilters {
  status: "active" | "archived";
  level: string;
  sex: string;
  q: string;
  sort: string;
  dir: "asc" | "desc";
}

export interface ArchivedRow {
  id: string;
  name: string;
  level: string;
  sex: string | null;
  birthYear: number | null;
  pp: number;
  ppbm: number;
  ci: number;
  brfd: number;
  mrsi: number;
  mph: number;
}

function gapClass(gap: number | null): string {
  if (gap === null) return "gap-neutral";
  if (gap <= -3) return "gap-red";
  if (gap <= -2) return "gap-orange";
  if (gap >= 3) return "gap-green";
  return "gap-neutral";
}

function sortLink(filters: RosterFilters, key: string): string {
  const nextDir = filters.sort === key && filters.dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams({
    status: filters.status,
    level: filters.level,
    sex: filters.sex,
    q: filters.q,
    sort: key,
    dir: nextDir,
  });
  return `/roster?${params.toString()}#roster`;
}

export function RosterTable({
  rows,
  archivedRows,
  filters,
  levels,
}: {
  rows: RosterAthlete[];
  archivedRows: ArchivedRow[];
  filters: RosterFilters;
  levels: string[];
}) {
  const showingArchived = filters.status === "archived";

  return (
    <div id="roster">
      <form className="filters" method="get">
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="dir" value={filters.dir} />
        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Level
          <select name="level" defaultValue={filters.level}>
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sex
          <select name="sex" defaultValue={filters.sex}>
            <option value="">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label>
          Search
          <input type="text" name="q" placeholder="Athlete name" defaultValue={filters.q} />
        </label>
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <Link href={sortLink(filters, "name")}>Name</Link>
              </th>
              <th>Level</th>
              <th>Sex</th>
              <th>Age</th>
              <th>
                <Link href={sortLink(filters, "pp")}>Peak Power</Link>
              </th>
              <th>Peak Power/BM</th>
              <th>Conc. Impulse</th>
              <th>Braking RFD</th>
              <th>mRSI</th>
              <th>
                <Link href={sortLink(filters, "mph")}>Actual</Link>
              </th>
              {!showingArchived && <th>Predicted</th>}
              {!showingArchived && (
                <th>
                  <Link href={sortLink(filters, "gap")}>Gap</Link>
                </th>
              )}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {showingArchived
              ? archivedRows.map((a) => (
                  <tr key={a.id}>
                    <td className="name-cell">
                      <Link href={`/athletes/${a.id}`}>{a.name}</Link>
                    </td>
                    <td>{a.level}</td>
                    <td>{a.sex ?? "—"}</td>
                    <td className="num">{ageFromBirthYear(a.birthYear) ?? "—"}</td>
                    <td className="num">{a.pp > 0 ? fmt1(a.pp) : "—"}</td>
                    <td className="num">{a.ppbm > 0 ? fmt1(a.ppbm) : "—"}</td>
                    <td className="num">{a.ci > 0 ? fmt1(a.ci) : "—"}</td>
                    <td className="num">{a.brfd > 0 ? fmt1(a.brfd) : "—"}</td>
                    <td className="num">{a.mrsi > 0 ? fmt1(a.mrsi) : "—"}</td>
                    <td className="num">{a.mph > 0 ? fmt1(a.mph) : "—"}</td>
                    <td>
                      <span className="badge neutral">Archived</span>
                    </td>
                  </tr>
                ))
              : rows.map((a) => (
                  <tr key={a.id}>
                    <td className="name-cell">
                      <Link href={`/athletes/${a.id}`}>{a.name}</Link>
                    </td>
                    <td>{a.level}</td>
                    <td>{a.sex ?? "—"}</td>
                    <td className="num">{ageFromBirthYear(a.birthYear) ?? "—"}</td>
                    <td className="num">{a.pp > 0 ? fmt1(a.pp) : "—"}</td>
                    <td className="num">{a.ppbm > 0 ? fmt1(a.ppbm) : "—"}</td>
                    <td className="num">{a.ci > 0 ? fmt1(a.ci) : "—"}</td>
                    <td className="num">{a.brfd > 0 ? fmt1(a.brfd) : "—"}</td>
                    <td className="num">{a.mrsi > 0 ? fmt1(a.mrsi) : "—"}</td>
                    <td className="num">{a.mph > 0 ? fmt1(a.mph) : "—"}</td>
                    <td className="num">{fmt1(a.pred)}</td>
                    <td className={`num ${gapClass(a.gap)}`}>{fmtSigned1(a.gap)}</td>
                    <td>
                      <span className={`badge ${a.category.replace(" ", "-")}`}>{categoryLabel(a.category)}</span>
                    </td>
                  </tr>
                ))}
            {(showingArchived ? archivedRows : rows).length === 0 && (
              <tr>
                <td colSpan={12} className="empty-state">
                  No athletes match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
