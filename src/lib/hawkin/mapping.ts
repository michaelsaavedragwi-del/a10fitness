import type { HawkinTest } from "./types";

/**
 * Confirmed against a live Hawkin Dynamics account's raw CMJ test payload
 * (2026-08-21). Metric keys are "<label>(<unit>)" strings, not the
 * abstracted camelCase ids from GET /v1/metrics — those two do not match.
 *
 * "Concentric Impulse" has no exact Hawkin equivalent (Hawkin uses
 * "propulsive" rather than "concentric" phase naming, and doesn't expose a
 * fixed 0-100ms window the way VALD does) — "Propulsive Net Impulse(N.s)" is
 * the closest standard CMJ concentric-phase impulse metric available.
 */
export const CMJ_METRIC_KEYS = {
  pp: "Peak Propulsive Power(W)",
  ppbm: "Peak Relative Propulsive Power(W/kg)",
  ci: "Propulsive Net Impulse(N.s)",
  brfd: "Braking RFD(N/s)",
  mrsi: "mRSI",
} as const;

export interface CmjMetrics {
  pp: number;
  ppbm: number;
  ci: number;
  brfd: number;
  mrsi: number;
}

export function extractCmjMetrics(test: HawkinTest): CmjMetrics | null {
  const metrics: Partial<CmjMetrics> = {};
  for (const [field, key] of Object.entries(CMJ_METRIC_KEYS) as [keyof CmjMetrics, string][]) {
    const value = test[key];
    if (typeof value !== "number") return null;
    metrics[field] = value;
  }
  return metrics as CmjMetrics;
}

/**
 * Movement-mechanics metrics beyond the core 5 — display-only, not fed into
 * the prediction model. Confirmed present in the same live test payload.
 * Unlike CMJ_METRIC_KEYS, a missing field here doesn't block import: it's
 * best-effort and defaults to 0 ("not captured on this test").
 */
export const EXTENDED_METRIC_KEYS = {
  peakLandingForce: "Peak Landing Force(N)",
  timeToStabilization: "Time to Stabilization(ms)",
  landingPerformanceIndex: "Landing Performance Index",
  lrBrakingImpulseIndex: "L|R Braking Impulse Index(%)",
  lrPropulsiveImpulseIndex: "L|R Propulsive Impulse Index(%)",
  lrLandingImpulseIndex: "L|R Landing Impulse Index(%)",
  propulsivePhase: "Propulsive Phase(s)",
  takeoffVelocity: "Takeoff Velocity(m/s)",
  peakVelocity: "Peak Velocity(m/s)",
} as const;

export type ExtendedMetricKey = keyof typeof EXTENDED_METRIC_KEYS;
export type ExtendedMetrics = Record<ExtendedMetricKey, number>;

export function extractExtendedMetrics(test: HawkinTest): ExtendedMetrics {
  const metrics = {} as ExtendedMetrics;
  for (const [field, key] of Object.entries(EXTENDED_METRIC_KEYS) as [ExtendedMetricKey, string][]) {
    const value = test[key];
    metrics[field] = typeof value === "number" ? value : 0;
  }
  return metrics;
}

/** Normalizes a name for matching: lowercase, trim, collapse whitespace, strip punctuation. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
