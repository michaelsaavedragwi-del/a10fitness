import type { TruStrengthTest } from "@prisma/client";
import { formatDate, fmt1 } from "@/lib/format";
import { deleteTruStrengthTest } from "@/lib/actions/truStrengthTests";

export function TruStrengthPanel({
  athleteId,
  tests,
  isOwner,
}: {
  athleteId: string;
  tests: TruStrengthTest[];
  isOwner: boolean;
}) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Tru Strength</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        Shoulder internal/external rotation isometric strength — synced from Hawkin, held
        separately from force-plate readings.
      </p>

      {tests.length === 0 ? (
        <div className="empty-state">No Tru Strength tests synced yet.</div>
      ) : (
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Side</th>
                <th>Direction</th>
                <th>Mode</th>
                <th>Peak Force (N)</th>
                <th>Avg Force (N)</th>
                <th>NF @50ms</th>
                <th>NF @100ms</th>
                <th>NF @150ms</th>
                <th>NF @200ms</th>
                <th>NF @250ms</th>
                <th>Peak RFD (N/s)</th>
                <th>Time to Peak (s)</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.side ?? "—"}</td>
                  <td>{t.direction ?? "—"}</td>
                  <td>{t.mode}</td>
                  <td className="num">{fmt1(t.peakForce)}</td>
                  <td className="num">{fmt1(t.avgForce)}</td>
                  <td className="num">{fmt1(t.netForce50)}</td>
                  <td className="num">{fmt1(t.netForce100)}</td>
                  <td className="num">{fmt1(t.netForce150)}</td>
                  <td className="num">{fmt1(t.netForce200)}</td>
                  <td className="num">{fmt1(t.netForce250)}</td>
                  <td className="num">{fmt1(t.peakRfd)}</td>
                  <td className="num">{t.timeToPeakForce.toFixed(2)}</td>
                  {isOwner && (
                    <td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteTruStrengthTest(t.id, athleteId);
                        }}
                      >
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Delete
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
