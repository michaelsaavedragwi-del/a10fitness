import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";
import type { RosterAthlete } from "@/lib/roster";
import { categoryColor, fmt1, fmtSigned1 } from "@/lib/format";

function ConversationCard({ athlete, sparkline }: { athlete: RosterAthlete; sparkline: number[] }) {
  const color = categoryColor(athlete.category);
  return (
    <Link href={`/athletes/${athlete.id}`} className={`athlete-card ${athlete.category.replace(" ", "-")}`}>
      <div className="row1">
        <span className="name">{athlete.name}</span>
        <span className={`gap ${color}`}>{fmtSigned1(athlete.gap)}</span>
      </div>
      <div className="level">
        {athlete.level} · Actual {fmt1(athlete.mph)} · Predicted {fmt1(athlete.pred)}
      </div>
      <div style={{ marginTop: 6 }}>
        <Sparkline values={sparkline} width={110} height={24} color="var(--blue)" />
      </div>
    </Link>
  );
}

export function NeedsAConversation({
  roster,
  sparklines,
}: {
  roster: RosterAthlete[];
  sparklines: Record<string, number[]>;
}) {
  const flagged = [...roster]
    .filter((a) => a.category === "high priority" || a.category === "moderate")
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0)); // most negative (worst) first

  if (flagged.length === 0) {
    return <div className="empty-state">Nobody needs a conversation right now.</div>;
  }

  const VISIBLE = 5;
  const visible = flagged.slice(0, VISIBLE);
  const rest = flagged.slice(VISIBLE);

  return (
    <div>
      {visible.map((a) => (
        <ConversationCard key={a.id} athlete={a} sparkline={sparklines[a.id] ?? []} />
      ))}
      {rest.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary className="hint" style={{ cursor: "pointer", padding: "4px 0" }}>
            Show {rest.length} more
          </summary>
          <div style={{ marginTop: 8 }}>
            {rest.map((a) => (
              <ConversationCard key={a.id} athlete={a} sparkline={sparklines[a.id] ?? []} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
