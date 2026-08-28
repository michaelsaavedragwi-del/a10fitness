"use client";

import { useEffect, useState } from "react";
import {
  importSelectedTruStrengthTests,
  dismissUnmatchedTruStrengthTest,
  createAndImportUnmatchedTruStrength,
} from "@/lib/actions/truStrengthSync";
import type {
  TruStrengthSyncPreview as TruStrengthSyncPreviewData,
  PreviewMatchedTruStrengthTest,
  PreviewUnmatchedTruStrengthTest,
} from "@/lib/hawkin/truStrengthSync";

export function TruStrengthSyncPreview() {
  const [preview, setPreview] = useState<TruStrengthSyncPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedNew, setSelectedNew] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<string | null>(null);

  async function fetchPreview() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sync/tru-strength-preview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      setPreview(data);
      const initialSelected: Record<string, boolean> = {};
      for (const t of data.matched as PreviewMatchedTruStrengthTest[]) initialSelected[t.testId] = true;
      setSelected(initialSelected);
      const initialSelectedNew: Record<string, boolean> = {};
      for (const t of data.unmatched as PreviewUnmatchedTruStrengthTest[]) {
        if (t.metrics) initialSelectedNew[t.testId] = false; // opt-in, not pre-checked — this creates a permanent roster entry
      }
      setSelectedNew(initialSelectedNew);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    const toImport = preview.matched.filter((t) => selected[t.testId]);
    setLoading(true);
    try {
      const res = await importSelectedTruStrengthTests(toImport);
      setResult(`Imported ${res.imported} test(s)${res.duplicates ? `, skipped ${res.duplicates} duplicate(s)` : ""}.`);
      await fetchPreview();
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(testId: string, profileName: string) {
    setLoading(true);
    try {
      await dismissUnmatchedTruStrengthTest(testId, profileName);
      await fetchPreview();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAndImport(tests: PreviewUnmatchedTruStrengthTest[]) {
    setLoading(true);
    try {
      const res = await createAndImportUnmatchedTruStrength(tests);
      const parts = [`Created ${res.created} new athlete(s)`];
      if (res.duplicates) parts.push(`${res.duplicates} already existed`);
      if (res.failures.length) parts.push(`${res.failures.length} failed: ${res.failures.join("; ")}`);
      setResult(parts.join(", ") + ".");
      await fetchPreview();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    fetchPreview();
  }, []);

  const selectedNewTests = preview?.unmatched.filter((t) => selectedNew[t.testId] && t.metrics) ?? [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Tru Strength Import Preview</h3>
        <button className="btn btn-sm" onClick={fetchPreview} disabled={loading}>
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {result && <div className="tag green" style={{ marginBottom: 12 }}>{result}</div>}

      {!preview && !error && <div className="empty-state">{loading ? "Checking for new tests…" : "No data yet."}</div>}

      {preview && (
        <>
          <h4>Matched — ready to import ({preview.matched.length})</h4>
          {preview.matched.length === 0 ? (
            <div className="empty-state">No new matched tests.</div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Athlete</th>
                    <th>Recorded</th>
                    <th>Side</th>
                    <th>Direction</th>
                    <th>Mode</th>
                    <th>Peak Force</th>
                    <th>Peak RFD</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.matched.map((t) => (
                    <tr key={t.testId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selected[t.testId]}
                          onChange={(e) => setSelected((s) => ({ ...s, [t.testId]: e.target.checked }))}
                        />
                      </td>
                      <td className="name-cell">{t.athleteName}</td>
                      <td>{new Date(t.recordedDate).toLocaleDateString()}</td>
                      <td>{t.side ?? "—"}</td>
                      <td>{t.direction ?? "—"}</td>
                      <td>{t.mode}</td>
                      <td className="num">{t.metrics.peakForce.toFixed(1)}</td>
                      <td className="num">{t.metrics.peakRfd.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 12 }}>
                <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
                  Import Selected
                </button>
              </div>
            </div>
          )}

          <h4>Unmatched profiles ({preview.unmatched.length})</h4>
          <p className="hint" style={{ marginBottom: 8 }}>
            No one on your roster matches these names. Check the box and create a new athlete
            (sport starts unassigned — fix it on the Roster page), or dismiss a profile that
            shouldn&apos;t be on your roster at all.
          </p>
          {preview.unmatched.length === 0 ? (
            <div className="empty-state">Every new test matched a roster athlete.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Profile Name</th>
                    <th>Recorded</th>
                    <th>Side</th>
                    <th>Direction</th>
                    <th>Peak Force</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.unmatched.map((t) => (
                    <tr key={t.testId}>
                      <td>
                        {t.metrics ? (
                          <input
                            type="checkbox"
                            checked={!!selectedNew[t.testId]}
                            onChange={(e) => setSelectedNew((s) => ({ ...s, [t.testId]: e.target.checked }))}
                          />
                        ) : (
                          <span className="hint" title="No calculable metrics on this test yet">
                            —
                          </span>
                        )}
                      </td>
                      <td className="name-cell">{t.profileName}</td>
                      <td>{new Date(t.recordedDate).toLocaleDateString()}</td>
                      <td>{t.side ?? "—"}</td>
                      <td>{t.direction ?? "—"}</td>
                      <td className="num">{t.metrics ? t.metrics.peakForce.toFixed(1) : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {t.metrics && (
                            <button className="btn btn-sm" onClick={() => handleCreateAndImport([t])} disabled={loading}>
                              Create &amp; Import
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(t.testId, t.profileName)} disabled={loading}>
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedNewTests.length > 0 && (
                <div style={{ padding: 12 }}>
                  <button className="btn btn-primary" onClick={() => handleCreateAndImport(selectedNewTests)} disabled={loading}>
                    Create &amp; Import {selectedNewTests.length} Selected
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
