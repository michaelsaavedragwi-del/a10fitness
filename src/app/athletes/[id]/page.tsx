import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getAthleteProfile } from "@/lib/roster";
import { archiveAthlete, unarchiveAthlete, deleteAthlete } from "@/lib/actions/athletes";
import { PredictionPanel } from "@/components/athlete/PredictionPanel";
import { MetricGrid } from "@/components/athlete/MetricGrid";
import { TestHistory } from "@/components/athlete/TestHistory";
import { AnatomyPanel } from "@/components/athlete/AnatomyPanel";
import { IsaProfile } from "@/components/athlete/IsaProfile";
import { MovementMechanicsPanel } from "@/components/athlete/MovementMechanicsPanel";
import { ageFromBirthYear, formatDate } from "@/lib/format";
import { RETEST_WINDOW_DAYS } from "@/lib/roster";

export default async function AthleteProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const profile = await getAthleteProfile(id);
  if (!profile) notFound();

  const { athlete, computed, tests } = profile;
  const isOwner = user.role === "owner";

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>{athlete.name}</h1>
          <p className="hint">
            {athlete.level}
            {athlete.sex && ` · ${athlete.sex}`}
            {ageFromBirthYear(athlete.birthYear) !== null && ` · Age ${ageFromBirthYear(athlete.birthYear)}`}
            {athlete.archived && (
              <>
                {" · "}
                <span className="badge neutral">Archived</span>
              </>
            )}
            {computed.lastForcePlateTestAt && ` · Last tested ${formatDate(computed.lastForcePlateTestAt)}`}
            {computed.retestOverdueByDays !== null && (
              <>
                {" · "}
                <span className="tag orange">
                  {computed.retestOverdueByDays} days past the {RETEST_WINDOW_DAYS}-day window
                </span>
              </>
            )}
          </p>
        </div>
        <div className="actions">
          <Link href={`/athletes/${athlete.id}/report`} className="btn">
            Progress Report
          </Link>
          {isOwner && (
            <>
              <Link href={`/athletes/${athlete.id}/edit`} className="btn">
                Edit
              </Link>
              {athlete.archived ? (
                <form
                  action={async () => {
                    "use server";
                    await unarchiveAthlete(athlete.id);
                  }}
                >
                  <button type="submit" className="btn">
                    Unarchive
                  </button>
                </form>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await archiveAthlete(athlete.id);
                  }}
                >
                  <button type="submit" className="btn">
                    Archive
                  </button>
                </form>
              )}
              <form
                action={async () => {
                  "use server";
                  await deleteAthlete(athlete.id);
                }}
              >
                <button type="submit" className="btn btn-danger">
                  Delete
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <section className="block">
        <PredictionPanel athlete={computed} />
      </section>

      <section className="block">
        <h2>Metrics</h2>
        <MetricGrid athlete={computed} />
      </section>

      <section className="block">
        <MovementMechanicsPanel tests={tests} />
      </section>

      <section className="block">
        <IsaProfile isa={athlete.isa} />
      </section>

      <section className="block">
        <AnatomyPanel rom={athlete.rom} />
      </section>

      <section className="block">
        <TestHistory athleteId={athlete.id} tests={tests} isOwner={isOwner} />
      </section>
    </main>
  );
}
