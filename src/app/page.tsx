import { requireUser } from "@/lib/auth-helpers";
import { getComputedRoster, getPpSparklines } from "@/lib/roster";
import { getRecentActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NeedsAConversation } from "@/components/dashboard/NeedsAConversation";
import { RetestDue } from "@/components/dashboard/RetestDue";
import { DashboardBanners } from "@/components/dashboard/DashboardBanners";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0] ?? user.name;

  const [roster, activity, syncState] = await Promise.all([
    getComputedRoster(),
    getRecentActivity(),
    prisma.syncState.findUnique({ where: { id: "main" } }),
  ]);

  const flaggedIds = roster
    .filter((a) => a.category === "high priority" || a.category === "moderate")
    .map((a) => a.id);
  const sparklines = await getPpSparklines(flaggedIds);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Hello, {firstName}</h1>
      </div>

      <DashboardBanners syncState={syncState} />

      <section className="block">
        <h2>Recent Activity</h2>
        <RecentActivity items={activity} />
      </section>

      <section className="block">
        <h2>Needs a Conversation</h2>
        <NeedsAConversation roster={roster} sparklines={sparklines} />
      </section>

      <section className="block">
        <h2>Due to Re-Test</h2>
        <RetestDue roster={roster} />
      </section>
    </main>
  );
}
