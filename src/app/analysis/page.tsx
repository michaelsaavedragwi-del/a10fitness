import Link from "next/link";
import { getComputedRoster, getBiggestMovers, getLeaderboards } from "@/lib/roster";
import { requireUser } from "@/lib/auth-helpers";
import { QuadrantChart } from "@/components/dashboard/QuadrantChart";
import { Leaderboards } from "@/components/dashboard/Leaderboards";
import { BiggestMovers } from "@/components/dashboard/BiggestMovers";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ sex?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const sex = sp.sex === "Male" || sp.sex === "Female" ? sp.sex : "";

  const [roster, movers, leaderboards] = await Promise.all([
    getComputedRoster(),
    getBiggestMovers(),
    getLeaderboards(),
  ]);

  const rosterFiltered = sex ? roster.filter((a) => a.sex === sex) : roster;
  const leaderboardsFiltered = {
    performance: sex ? leaderboards.performance.filter((e) => e.sex === sex) : leaderboards.performance,
    power: sex ? leaderboards.power.filter((e) => e.sex === sex) : leaderboards.power,
  };

  const sexLink = (value: string) => (value ? `/analysis?sex=${value}` : "/analysis");

  return (
    <main className="page">
      <div className="page-header">
        <h1>Analysis</h1>
        <div className="actions">
          <Link href={sexLink("")} className={`btn btn-sm ${sex === "" ? "btn-primary" : ""}`}>
            All
          </Link>
          <Link href={sexLink("Male")} className={`btn btn-sm ${sex === "Male" ? "btn-primary" : ""}`}>
            Male
          </Link>
          <Link href={sexLink("Female")} className={`btn btn-sm ${sex === "Female" ? "btn-primary" : ""}`}>
            Female
          </Link>
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
