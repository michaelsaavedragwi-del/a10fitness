/**
 * THE PREDICTION MODEL.
 *
 * This is the one file to rewrite when you adapt this dashboard to your own
 * population. Keep the same shape — feed raw per-athlete metrics in, get
 * `pred` / `gap` / `category` / ranks back out — and nothing downstream
 * needs to change.
 *
 * Never store the outputs of this file. Recompute on every read.
 */

export const FP_SENSITIVITY = 1.6;

/** Outlier exclusion from the regression fit set (see selectFitExclusions). */
export const OUTLIER_Z_THRESHOLD = 3.5;
export const OUTLIER_MAX_FRACTION = 0.1;
export const MIN_FIT_SIZE = 8;

export type Category =
  | "high priority"
  | "moderate"
  | "on track"
  | "overperforming"
  | "awaiting performance"
  | "awaiting data"
  | "insufficient data";

export const METRIC_KEYS = ["pp", "ppbm", "ci", "mph", "brfd", "mrsi"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface RawAthleteInput {
  id: string;
  name: string;
  level: string;
  sex: string | null;
  pp: number;
  ppbm: number;
  ci: number;
  brfd: number;
  mrsi: number;
  mph: number;
  predOverride: number | null;
}

export interface MetricStanding {
  value: number;
  rank: number | null;
  percentile: number | null;
  total: number | null;
  bottomQuartile: boolean;
}

export interface ComputedAthlete extends RawAthleteInput {
  pred: number | null;
  gap: number | null;
  category: Category;
  isManualOverride: boolean;
  hasPlateData: boolean;
  hasPerformance: boolean;
  /** The leave-one-out, per-level re-centering offset added on top of the raw regression output. Null for manual overrides / no plate data. */
  modelOffset: number | null;
  /** True if this athlete qualified for the fit set but was held out as a statistical outlier — they're still predicted/ranked/displayed normally, just excluded from tilting the regression line. */
  excludedFromFit: boolean;
  standings: Record<MetricKey, MetricStanding>;
}

function round1(n: number): number {
  return parseFloat(n.toFixed(1));
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Modified z-scores (Iglewicz & Hoaglin): 0.6745 * (x - median) / MAD. Robust
 * to the outliers themselves — a raw mean/stddev z-score gets inflated by the
 * very point it's trying to flag, which can hide it. |score| > 3.5 is the
 * standard threshold for this specific formula.
 */
function modifiedZScores(xs: number[]): number[] {
  const med = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - med)));
  if (mad === 0) return xs.map(() => 0); // can't distinguish — don't flag anyone
  return xs.map((x) => (0.6745 * (x - med)) / mad);
}

/**
 * Holds out genuine extremes from the regression fit set only — they are
 * still predicted, ranked, and displayed exactly like everyone else, they
 * just stop tilting the line. Flags on either mph or pp beyond the modified
 * z-score threshold, capped at ~10% of the candidate set, and never reduces
 * the fit set below MIN_FIT_SIZE athletes.
 */
function selectFitExclusions(candidates: RawAthleteInput[]): Set<string> {
  const maxExclusions = Math.min(
    Math.floor(candidates.length * OUTLIER_MAX_FRACTION),
    Math.max(candidates.length - MIN_FIT_SIZE, 0),
  );
  if (maxExclusions <= 0) return new Set();

  const mphZ = modifiedZScores(candidates.map((a) => a.mph));
  const ppZ = modifiedZScores(candidates.map((a) => a.pp));

  const scored = candidates
    .map((a, i) => ({ id: a.id, extremity: Math.max(Math.abs(mphZ[i]), Math.abs(ppZ[i])) }))
    .filter((s) => s.extremity > OUTLIER_Z_THRESHOLD)
    .sort((a, b) => b.extremity - a.extremity)
    .slice(0, maxExclusions);

  return new Set(scored.map((s) => s.id));
}

/** Simple linear regression of y on x. Returns null if the fit is degenerate (zero-variance x). */
function linreg(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const xbar = mean(xs);
  const ybar = mean(ys);
  let num = 0;
  let denom = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xbar) * (ys[i] - ybar);
    denom += (xs[i] - xbar) * (xs[i] - xbar);
  }
  if (denom === 0) return null;
  const slope = num / denom;
  const intercept = ybar - slope * xbar;
  return { slope, intercept };
}

/** Tenths-based bucketing so float noise (-2.9999999996) can't cross a threshold boundary. */
function categorize(gap: number): Category {
  const tenths = Math.round(gap * 10);
  if (tenths <= -30) return "high priority";
  if (tenths <= -20) return "moderate";
  if (tenths < 30) return "on track";
  return "overperforming";
}

/**
 * Recomputes prediction/gap/category/ranks for an active roster (the caller
 * must already have excluded archived athletes).
 */
export function computeRoster(athletes: RawAthleteInput[]): ComputedAthlete[] {
  const primaryFitSet = athletes.filter((a) => a.mph > 0 && a.pp > 0);
  const candidateFitSet = primaryFitSet.length >= 2 ? primaryFitSet : athletes;

  const excludedIds = selectFitExclusions(candidateFitSet);
  const fitSet = candidateFitSet.filter((a) => !excludedIds.has(a.id));

  const fitPp = fitSet.length >= 2 ? linreg(fitSet.map((a) => a.pp), fitSet.map((a) => a.mph)) : null;
  const fitPpbm = fitSet.length >= 2 ? linreg(fitSet.map((a) => a.ppbm), fitSet.map((a) => a.mph)) : null;
  const fitCi = fitSet.length >= 2 ? linreg(fitSet.map((a) => a.ci), fitSet.map((a) => a.mph)) : null;

  const modelUsable = fitSet.length >= 2 && fitPp !== null && fitPpbm !== null && fitCi !== null;

  const standings = computeStandings(athletes);

  if (!modelUsable) {
    return athletes.map((a) => ({
      ...a,
      pred: null,
      gap: null,
      category: "insufficient data",
      isManualOverride: false,
      hasPlateData: a.pp > 0,
      hasPerformance: a.mph > 0,
      modelOffset: null,
      excludedFromFit: false,
      standings: standings[a.id],
    }));
  }

  const meanVelo = mean(fitSet.map((a) => a.mph));

  // fpPred (pre-offset) for every fit-set member, needed for leave-one-out residuals.
  const fpPredByFitId = new Map<string, number>();
  for (const a of fitSet) {
    const raw =
      (fitPp!.slope * a.pp + fitPp!.intercept +
        (fitPpbm!.slope * a.ppbm + fitPpbm!.intercept) +
        (fitCi!.slope * a.ci + fitCi!.intercept)) /
      3;
    fpPredByFitId.set(a.id, meanVelo + FP_SENSITIVITY * (raw - meanVelo));
  }

  function fpPredFor(a: RawAthleteInput): number {
    const raw =
      (fitPp!.slope * a.pp + fitPp!.intercept +
        (fitPpbm!.slope * a.ppbm + fitPpbm!.intercept) +
        (fitCi!.slope * a.ci + fitCi!.intercept)) /
      3;
    return meanVelo + FP_SENSITIVITY * (raw - meanVelo);
  }

  /**
   * Leave-one-out re-centering, by sex first and then by level within it.
   * Pooling every sex together into one offset is exactly how a systematic
   * male/female difference in the pp-to-performance relationship reads as
   * one sex "underperforming" on the dashboard — the shared regression line
   * reflects mostly whichever sex has more fit-set data, and the other sex's
   * residual-from-that-line is a real, correctable bias, not a real gap.
   * Falls through to today's level-only behavior when sex isn't recorded, so
   * athletes without it are computed exactly as before this field existed.
   */
  function offsetFor(a: RawAthleteInput): number {
    const others = fitSet.filter((p) => p.id !== a.id);

    let pool: RawAthleteInput[] = [];
    if (a.sex) {
      const sameSexAndLevel = others.filter((p) => p.sex === a.sex && p.level === a.level);
      const sameSex = others.filter((p) => p.sex === a.sex);
      pool = sameSexAndLevel.length >= 2 ? sameSexAndLevel : sameSex.length >= 2 ? sameSex : others;
    } else {
      const sameLevel = others.filter((p) => p.level === a.level);
      pool = sameLevel.length >= 2 ? sameLevel : others;
    }

    if (pool.length === 0) return 0;
    const residuals = pool.map((p) => p.mph - fpPredByFitId.get(p.id)!);
    return mean(residuals);
  }

  return athletes.map((a) => {
    const hasPlateData = a.pp > 0;
    const hasPerformance = a.mph > 0;
    const hasOverride = a.predOverride !== null && a.predOverride !== undefined && a.predOverride > 0;

    let pred: number | null = null;
    let isManualOverride = false;
    let modelOffset: number | null = null;

    if (hasOverride) {
      pred = round1(a.predOverride as number);
      isManualOverride = true;
    } else if (hasPlateData) {
      const offset = offsetFor(a);
      modelOffset = round1(offset);
      pred = round1(fpPredFor(a) + offset);
    }

    let gap: number | null = null;
    let category: Category;

    if (pred === null) {
      category = "awaiting data";
    } else if (!hasPerformance) {
      category = "awaiting performance";
    } else {
      gap = round1(a.mph - pred);
      category = categorize(gap);
    }

    return {
      ...a,
      pred,
      gap,
      category,
      isManualOverride,
      hasPlateData,
      hasPerformance,
      modelOffset,
      excludedFromFit: excludedIds.has(a.id),
      standings: standings[a.id],
    };
  });
}

function computeStandings(athletes: RawAthleteInput[]): Record<string, Record<MetricKey, MetricStanding>> {
  const result: Record<string, Record<MetricKey, MetricStanding>> = {};
  for (const a of athletes) {
    result[a.id] = {} as Record<MetricKey, MetricStanding>;
  }

  for (const key of METRIC_KEYS) {
    const measured = athletes.filter((a) => a[key] > 0);
    const m = measured.length;

    const descending = [...measured].sort((a, b) => b[key] - a[key]);
    const rankById = new Map<string, number>();
    descending.forEach((a, idx) => rankById.set(a.id, idx + 1));

    const ascending = [...measured].sort((a, b) => a[key] - b[key]);
    const quartileValue = m > 0 ? ascending[Math.floor(m * 0.25)][key] : null;

    for (const a of athletes) {
      const value = a[key];
      if (value <= 0 || m === 0) {
        result[a.id][key] = { value, rank: null, percentile: null, total: null, bottomQuartile: false };
        continue;
      }
      const rank = rankById.get(a.id)!;
      const percentile = Math.round((1 - rank / m) * 100);
      const bottomQuartile = quartileValue !== null && value <= quartileValue;
      result[a.id][key] = { value, rank, percentile, total: m, bottomQuartile };
    }
  }

  return result;
}
