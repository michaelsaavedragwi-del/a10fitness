export interface HawkinAthlete {
  id: string;
  name: string;
  active: boolean;
  teams: string[];
  groups: string[];
  /** Bare birth year string (e.g. "2001") — confirmed live; not in the official docs and not always present. */
  dob?: string;
}

export interface HawkinTestType {
  id: string;
  name: string;
  canonicalId: string;
  tags: { id: string; name: string; description: string }[];
}

/**
 * A test record from GET /v1. Metric values live as sibling keys alongside
 * id/testType/athlete/timestamp, keyed by "<Label>(<Unit>)" — e.g.
 * "Peak Propulsive Power(W)" — confirmed against a live account; there is no
 * abstracted metric-id key on this endpoint (that only exists on /v1/metrics).
 */
export interface HawkinTest {
  id: string;
  testType: HawkinTestType;
  athlete: { id: string; name: string };
  timestamp: number; // unix seconds
  segment: string;
  active?: boolean;
  [metricKey: string]: unknown;
}

export interface HawkinTestsResponse {
  data: HawkinTest[];
  count: number;
  lastSyncTime: number;
  lastTestTime: number;
  nextCursor?: string | null;
}

export interface HawkinAthletesResponse {
  data: HawkinAthlete[];
  count: number;
}
