import Link from "next/link";
import { getComputedRoster } from "@/lib/roster";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { ageGroupFromBirthYear, AGE_GROUPS, type AgeGroup } from "@/lib/ageGroup";
import { RosterTable, type RosterFilters, type ArchivedRow } from "@/components/dashboard/RosterTable";
import { AwaitingData } from "@/components/dashboard/AwaitingData";

function isAgeGroup(v: string): v is AgeGroup {
  return (AGE_GROUPS as string[]).includes(v);
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sport?: string; sex?: string; ageGroup?: string; q?: string; sort?: string; dir?: string }>;
}) {
  const user = await requireUser();
  const isOwner = user.role === "owner";

  const sp = await searchParams;
  const filters: RosterFilters = {
    status: sp.status === "archived" ? "archived" : "active",
    sport: sp.sport ?? "",
    sex: sp.sex === "Male" || sp.sex === "Female" ? sp.sex : "",
    ageGroup: sp.ageGroup && isAgeGroup(sp.ageGroup) ? sp.ageGroup : "",
    q: sp.q ?? "",
    sort: sp.sort ?? "name",
    dir: sp.dir === "asc" ? "asc" : sp.sort ? "desc" : "asc",
  };

  const [roster, archived] = await Promise.all([
    getComputedRoster(),
    filters.status === "archived"
      ? prisma.athlete.findMany({ where: { archived: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const sports = Array.from(new Set(roster.map((a) => a.sport).filter(Boolean))).sort();

  const activeFiltered = roster
    .filter((a) => (filters.sport ? a.sport === filters.sport : true))
    .filter((a) => (filters.sex ? a.sex === filters.sex : true))
    .filter((a) => (filters.ageGroup ? a.ageGroup === filters.ageGroup : true))
    .filter((a) => (filters.q ? a.name.toLowerCase().includes(filters.q.toLowerCase()) : true));

  const archivedFiltered: ArchivedRow[] = archived
    .filter((a) => (filters.sport ? a.sport === filters.sport : true))
    .filter((a) => (filters.sex ? a.sex === filters.sex : true))
    .filter((a) => (filters.ageGroup ? ageGroupFromBirthYear(a.birthYear) === filters.ageGroup : true))
    .filter((a) => (filters.q ? a.name.toLowerCase().includes(filters.q.toLowerCase()) : true))
    .map((a) => ({
      id: a.id,
      name: a.name,
      sport: a.sport,
      sex: a.sex,
      birthYear: a.birthYear,
      pp: a.pp,
      ppbm: a.ppbm,
      ci: a.ci,
      brfd: a.brfd,
      mrsi: a.mrsi,
      mph: a.mph,
    }));

  const dir = filters.dir === "asc" ? 1 : -1;
  activeFiltered.sort((a, b) => {
    switch (filters.sort) {
      case "pp":
        return dir * (a.pp - b.pp);
      case "mph":
        return dir * (a.mph - b.mph);
      case "gap":
        return dir * ((a.gap ?? -Infinity) - (b.gap ?? -Infinity));
      default:
        return dir * a.name.localeCompare(b.name);
    }
  });

  return (
    <main className="page page--wide">
      <div className="page-header">
        <h1>Roster</h1>
        {isOwner && (
          <div className="actions">
            <Link href="/athletes/new" className="btn btn-primary">
              Add Athlete
            </Link>
          </div>
        )}
      </div>

      <section className="block">
        <RosterTable rows={activeFiltered} archivedRows={archivedFiltered} filters={filters} sports={sports} />
      </section>

      <section className="block">
        <h2>Awaiting Data</h2>
        <p className="hint">Added with just a sport and performance — held out of the prediction math until their first force-plate test.</p>
        <AwaitingData roster={roster} />
      </section>
    </main>
  );
}
