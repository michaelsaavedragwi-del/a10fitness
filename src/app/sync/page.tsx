import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { SyncPreview } from "@/components/sync/SyncPreview";

export default async function SyncPage() {
  const user = await requireUser();
  const isOwner = user.role === "owner";

  const [syncState, configured] = await Promise.all([
    prisma.syncState.findUnique({ where: { id: "main" } }),
    Promise.resolve(Boolean(process.env.HAWKIN_API_KEY)),
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Force-Plate Sync</h1>
      </div>

      <section className="block">
        <div className="card">
          <h3>Connection</h3>
          {configured ? (
            <p>
              <span className="tag green">Configured</span> Hawkin Dynamics credentials are set.
              Region: {process.env.HAWKIN_REGION ?? "Americas"}.
            </p>
          ) : (
            <p>
              <span className="tag red">Not configured</span> Set <code>HAWKIN_API_KEY</code>{" "}
              (and optionally <code>HAWKIN_REGION</code>) in your environment to enable sync.
            </p>
          )}
          <p className="hint">
            Nightly auto-sync runs against <code>/api/cron/hawkin-sync</code>, gated by the{" "}
            <code>CRON_SECRET</code> header. Last run:{" "}
            {syncState?.lastRunAt ? formatDate(syncState.lastRunAt) : "never"}
            {syncState ? ` — imported ${syncState.imported} test(s) last run` : ""}.
          </p>
        </div>
      </section>

      <section className="block">
        {isOwner ? (
          configured ? (
            <SyncPreview />
          ) : (
            <div className="card empty-state">Connect your force-plate provider&apos;s API credentials to preview and import tests.</div>
          )
        ) : (
          <div className="card empty-state">Only an owner can run an import. Ask a coach with owner access to sync new tests.</div>
        )}
      </section>
    </main>
  );
}
