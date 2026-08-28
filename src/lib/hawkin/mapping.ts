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

/**
 * Hawkin's "Tru Strength" line — isometric/free-run shoulder internal and
 * external rotation strength testing. Two canonical test types share this
 * exact metric key set (confirmed against a live account, 2026-08-28):
 * "TS Isometric Test" (a held contraction) and "TS Free Run" (a faster,
 * more dynamic pull) — same metrics, different protocol, so `mode` is
 * captured alongside them rather than assumed.
 */
export const TRU_STRENGTH_CANONICAL_IDS = {
  isometric: "umnEZPgi6zaxuw0KhUpM",
  freeRun: "4KlQgKmBxbOY6uKTLDFL",
} as const;

export const TRU_STRENGTH_METRIC_KEYS = {
  peakForce: "Peak Force(N)",
  avgForce: "Avg. Force(N)",
  netForce50: "Net Force at 50 ms(N)",
  netForce100: "Net Force at 100 ms(N)",
  netForce150: "Net Force at 150 ms(N)",
  netForce200: "Net Force at 200 ms(N)",
  netForce250: "Net Force at 250 ms(N)",
  peakRfd: "Peak RFD(N/s)",
  timeToPeakForce: "Time to Peak Force(s)",
} as const;

export interface TruStrengthMetrics {
  peakForce: number;
  avgForce: number;
  netForce50: number;
  netForce100: number;
  netForce150: number;
  netForce200: number;
  netForce250: number;
  peakRfd: number;
  timeToPeakForce: number;
}

export function extractTruStrengthMetrics(test: HawkinTest): TruStrengthMetrics | null {
  const metrics: Partial<TruStrengthMetrics> = {};
  for (const [field, key] of Object.entries(TRU_STRENGTH_METRIC_KEYS) as [keyof TruStrengthMetrics, string][]) {
    const value = test[key];
    if (typeof value !== "number") return null;
    metrics[field] = value;
  }
  return metrics as TruStrengthMetrics;
}

/** Side and rotation direction ride on the test-type's tags, not metric keys. */
export function truStrengthSide(test: HawkinTest): "Left" | "Right" | null {
  const names = test.testType.tags.map((t) => t.name);
  if (names.includes("Left")) return "Left";
  if (names.includes("Right")) return "Right";
  return null;
}

export function truStrengthDirection(test: HawkinTest): "Internal" | "External" | null {
  const names = test.testType.tags.map((t) => t.name);
  if (names.includes("Internal Rotation")) return "Internal";
  if (names.includes("External Rotation")) return "External";
  return null;
}

export function truStrengthMode(canonicalId: string): "Isometric" | "Free Run" {
  return canonicalId === TRU_STRENGTH_CANONICAL_IDS.isometric ? "Isometric" : "Free Run";
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
