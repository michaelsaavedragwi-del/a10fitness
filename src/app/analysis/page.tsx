import Link from "next/link";
import { getComputedRoster, getBiggestMovers, getLeaderboards } from "@/lib/roster";
import { requireUser } from "@/lib/auth-helpers";
import { AGE_GROUPS, type AgeGroup } from "@/lib/ageGroup";
import { QuadrantChart } from "@/components/dashboard/QuadrantChart";
import { Leaderboards } from "@/components/dashboard/Leaderboards";
import { BiggestMovers } from "@/components/dashboard/BiggestMovers";

function isAgeGroup(v: string): v is AgeGroup {
  return (AGE_GROUPS as string[]).includes(v);
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ sex?: string; ageGroup?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const sex = sp.sex === "Male" || sp.sex === "Female" ? sp.sex : "";
  const ageGroup = sp.ageGroup && isAgeGroup(sp.ageGroup) ? sp.ageGroup : "";

  const [roster, movers, leaderboards] = await Promise.all([
    getComputedRoster(),
    getBiggestMovers(),
    getLeaderboards(),
  ]);

  const rosterFiltered = roster
    .filter((a) => (sex ? a.sex === sex : true))
    .filter((a) => (ageGroup ? a.ageGroup === ageGroup : true));
  const leaderboardsFiltered = {
    performance: leaderboards.performance
      .filter((e) => (sex ? e.sex === sex : true))
      .filter((e) => (ageGroup ? e.ageGroup === ageGroup : true)),
    power: leaderboards.power
      .filter((e) => (sex ? e.sex === sex : true))
      .filter((e) => (ageGroup ? e.ageGroup === ageGroup : true)),
  };

  const filterLink = (next: { sex?: string; ageGroup?: string }) => {
    const params = new URLSearchParams();
    const nextSex = next.sex ?? sex;
    const nextAgeGroup = next.ageGroup ?? ageGroup;
    if (nextSex) params.set("sex", nextSex);
    if (nextAgeGroup) params.set("ageGroup", nextAgeGroup);
    const qs = params.toString();
    return qs ? `/analysis?${qs}` : "/analysis";
  };

  return (
    <main className="page">
      <div className="page-header">
        <h1>Analysis</h1>
      </div>

      <div className="filters">
        <div>
          <span className="hint">Sex:</span>{" "}
          <Link href={filterLink({ sex: "" })} className={`btn btn-sm ${sex === "" ? "btn-primary" : ""}`}>
            All
          </Link>{" "}
          <Link href={filterLink({ sex: "Male" })} className={`btn btn-sm ${sex === "Male" ? "btn-primary" : ""}`}>
            Male
          </Link>{" "}
          <Link href={filterLink({ sex: "Female" })} className={`btn btn-sm ${sex === "Female" ? "btn-primary" : ""}`}>
            Female
          </Link>
        </div>
        <div>
          <span className="hint">Age Group:</span>{" "}
          <Link href={filterLink({ ageGroup: "" })} className={`btn btn-sm ${ageGroup === "" ? "btn-primary" : ""}`}>
            All
          </Link>{" "}
          {AGE_GROUPS.map((g) => (
            <Link key={g} href={filterLink({ ageGroup: g })} className={`btn btn-sm ${ageGroup === g ? "btn-primary" : ""}`}>
              {g}
            </Link>
          ))}
        </div>
      </div>

      <section className="block">
        <h2>Power vs. Velocity</h2>
        <div className="card">
          <QuadrantChart roster={rosterFiltered} />
        </div>
      </section>

      <section className="block">
        <h2>Leaderboards</h2>
        <Leaderboards performance={leaderboardsFiltered.performance} power={leaderboardsFiltered.power} />
      </section>

      <section className="block">
        <h2>Biggest Movers</h2>
        <BiggestMovers power={movers.power} performance={movers.performance} />
      </section>
    </main>
  );
}
