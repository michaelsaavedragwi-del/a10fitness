import Link from "next/link";
import { formatDate } from "@/lib/format";

interface SyncStateLike {
  lastError: string | null;
  lastErrorAt: Date | null;
  unmatched: unknown;
}

/**
 * Visible only when something is actually broken — never a permanent empty
 * panel that trains people to ignore it.
 */
export function DashboardBanners({ syncState }: { syncState: SyncStateLike | null }) {
  if (!syncState) return null;

  const unmatchedNames = Array.isArray(syncState.unmatched) ? (syncState.unmatched as string[]) : [];

  if (!syncState.lastError && unmatchedNames.length === 0) return null;

  return (
    <div className="block" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
      {syncState.lastError && (
        <div className="auth-error">
          Last force-plate sync failed{syncState.lastErrorAt ? ` (${formatDate(syncState.lastErrorAt)})` : ""}:{" "}
          {syncState.lastError} — <Link href="/sync">check Sync</Link>.
        </div>
      )}
      {unmatchedNames.length > 0 && (
        <div className="auth-error" style={{ background: "var(--orange-bg)", borderColor: "var(--orange-border)", color: "var(--orange)" }}>
          {unmatchedNames.length} synced profile{unmatchedNames.length === 1 ? "" : "s"} didn&apos;t match anyone on
          your roster — <Link href="/sync">review on Sync</Link>.
        </div>
      )}
    </div>
  );
}
