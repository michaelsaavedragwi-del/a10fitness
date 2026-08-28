import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getAthleteProfile } from "@/lib/roster";
import { archiveAthlete, unarchiveAthlete, deleteAthlete } from "@/lib/actions/athletes";
import { MetricGrid } from "@/components/athlete/MetricGrid";
import { TestHistory } from "@/components/athlete/TestHistory";
import { MovementMechanicsPanel } from "@/components/athlete/MovementMechanicsPanel";
import { TruStrengthPanel } from "@/components/athlete/TruStrengthPanel";
import { ProgressChart } from "@/components/athlete/ProgressChart";
import { ageFromBirthYear, formatDate } from "@/lib/format";
import { ageGroupFromBirthYear } from "@/lib/ageGroup";
import { RETEST_WINDOW_DAYS } from "@/lib/roster";

export default async function AthleteProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const profile = await getAthleteProfile(id);
  if (!profile) notFound();

  const { athlete, computed, tests, truStrengthTests } = profile;
  const isOwner = user.role === "owner";

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>{athlete.name}</h1>
          <p className="hint">
            {athlete.sport || "No sport set"}
            {athlete.sex && ` · ${athlete.sex}`}
            {ageFromBirthYear(athlete.birthYear) !== null && ` · Age ${ageFromBirthYear(athlete.birthYear)}`}
            {ageGroupFromBirthYear(athlete.birthYear) !== null && ` (${ageGroupFromBirthYear(athlete.birthYear)})`}
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
        <h2>Peak Power Over Time</h2>
        <div className="card">
          <ProgressChart tests={[...tests].reverse()} />
        </div>
      </section>

      <section className="block">
        <h2>Metrics</h2>
        <MetricGrid athlete={computed} />
      </section>

      <section className="block">
        <MovementMechanicsPanel tests={tests} />
      </section>

      <section className="block">
        <TruStrengthPanel athleteId={athlete.id} tests={truStrengthTests} isOwner={isOwner} />
      </section>

      <section className="block">
        <TestHistory athleteId={athlete.id} tests={tests} isOwner={isOwner} />
      </section>
    </main>
  );
}
