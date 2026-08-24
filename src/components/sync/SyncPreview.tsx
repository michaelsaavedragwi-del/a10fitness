"use client";

import { useEffect, useState } from "react";
import { importSelectedTests, dismissUnmatchedTest } from "@/lib/actions/sync";
import type { SyncPreview as SyncPreviewData, PreviewMatchedTest } from "@/lib/hawkin/sync";

export function SyncPreview() {
  const [preview, setPreview] = useState<SyncPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<string | null>(null);

  async function fetchPreview() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sync/preview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      setPreview(data);
      const initialSelected: Record<string, boolean> = {};
      for (const t of data.matched as PreviewMatchedTest[]) initialSelected[t.testId] = true;
      setSelected(initialSelected);
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
      const res = await importSelectedTests(toImport);
      setResult(`Imported ${res.imported} test(s)${res.duplicates ? `, skipped ${res.duplicates} duplicate(s)` : ""}.`);
      await fetchPreview();
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(testId: string, profileName: string) {
    setLoading(true);
    try {
      await dismissUnmatchedTest(testId, profileName);
      await fetchPreview();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    fetchPreview();
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Import Preview</h3>
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
                    <th>Peak Power</th>
                    <th>Peak Power/BM</th>
                    <th>Conc. Impulse</th>
                    <th>Braking RFD</th>
                    <th>mRSI</th>
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
                      <td className="num">{t.metrics.pp.toFixed(1)}</td>
                      <td className="num">{t.metrics.ppbm.toFixed(1)}</td>
                      <td className="num">{t.metrics.ci.toFixed(1)}</td>
                      <td className="num">{t.metrics.brfd.toFixed(1)}</td>
                      <td className="num">{t.metrics.mrsi.toFixed(2)}</td>
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
          {preview.unmatched.length === 0 ? (
            <div className="empty-state">Every new test matched a roster athlete.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Profile Name</th>
                    <th>Recorded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.unmatched.map((t) => (
                    <tr key={t.testId}>
                      <td className="name-cell">{t.profileName}</td>
                      <td>{new Date(t.recordedDate).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(t.testId, t.profileName)}>
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
