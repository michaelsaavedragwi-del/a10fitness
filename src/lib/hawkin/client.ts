import type { HawkinAthletesResponse, HawkinTestsResponse } from "./types";

/** CMJ (Countermovement Jump) canonical test type id — stable across all Hawkin accounts. */
export const CMJ_CANONICAL_ID = "7nNduHeM5zETPjHxvm7s";

function regionHost(): string {
  const region = process.env.HAWKIN_REGION ?? "Americas";
  switch (region) {
    case "Europe":
      return "https://eu.cloud.hawkindynamics.com/api";
    case "Asia/Pacific":
      return "https://apac.cloud.hawkindynamics.com/api";
    default:
      return "https://cloud.hawkindynamics.com/api";
  }
}

/** The org slug in the data URL; Hawkin defaults this to "v1" for standard accounts. */
function apiBase(): string {
  const configured = process.env.HAWKIN_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  return `${regionHost()}/v1`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Access tokens expire quickly — cache until shortly before expires_at. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const refreshToken = process.env.HAWKIN_API_KEY;
  if (!refreshToken) throw new Error("HAWKIN_API_KEY is not set");

  const tokenUrl = process.env.HAWKIN_TOKEN_URL ?? `${regionHost()}/token`;
  const res = await fetch(tokenUrl, {
    headers: { Authorization: `Bearer ${refreshToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorMessages: Record<number, string> = {
      401: "Refresh token is invalid or expired.",
      403: "Refresh token is missing.",
      500: "Hawkin Dynamics server error.",
    };
    throw new Error(`Hawkin auth failed (${res.status}): ${errorMessages[res.status] ?? await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_at: number };
  cachedToken = { token: data.access_token, expiresAt: data.expires_at * 1000 };
  return cachedToken.token;
}

async function hawkinFetch<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Hawkin request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Fetches tests changed since a given time (incremental sync). Filters to CMJ
 * client-side rather than passing testTypeId, since the API only allows
 * testTypeId in combination with from/to (not syncFrom/syncTo).
 */
export async function getTestsSince(sinceUnixSeconds: number): Promise<HawkinTestsResponse["data"]> {
  const base = apiBase();
  let cursor: string | null = null;
  const all: HawkinTestsResponse["data"] = [];

  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({ syncFrom: String(sinceUnixSeconds), includeInactive: "false" });
    if (cursor) params.set("cursor", cursor);
    const data = await hawkinFetch<HawkinTestsResponse>(`${base}?${params.toString()}`);
    all.push(...data.data);
    cursor = data.nextCursor ?? null;
    if (!cursor) break;
  }

  return all;
}

export async function getAthletes(): Promise<HawkinAthletesResponse["data"]> {
  const base = apiBase();
  const data = await hawkinFetch<HawkinAthletesResponse>(`${base}/athletes?includeInactive=false`);
  return data.data;
}
