import { getComputedRoster, getBiggestMovers, getLeaderboards } from "@/lib/roster";
import { requireUser } from "@/lib/auth-helpers";
import { QuadrantChart } from "@/components/dashboard/QuadrantChart";
import { Leaderboards } from "@/components/dashboard/Leaderboards";
import { BiggestMovers } from "@/components/dashboard/BiggestMovers";

export default async function AnalysisPage() {
  await requireUser();

  const [roster, movers, leaderboards] = await Promise.all([
    getComputedRoster(),
    getBiggestMovers(),
    getLeaderboards(),
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Analysis</h1>
      </div>

      <section className="block">
        <h2>Power vs. Velocity</h2>
        <div className="card">
          <QuadrantChart roster={roster} />
        </div>
      </section>

      <section className="block">
        <h2>Leaderboards</h2>
        <Leaderboards performance={leaderboards.performance} power={leaderboards.power} />
      </section>

      <section className="block">
        <h2>Biggest Movers</h2>
        <BiggestMovers power={movers.power} performance={movers.performance} />
      </section>
    </main>
  );
}
