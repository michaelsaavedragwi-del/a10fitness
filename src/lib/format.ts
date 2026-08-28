import type { Category } from "@/lib/prediction";
import { formatDateInClubTz } from "@/lib/timezone";

export type StatusColor = "red" | "orange" | "green" | "neutral";

export function categoryColor(category: Category): StatusColor {
  switch (category) {
    case "high priority":
      return "red";
    case "moderate":
      return "orange";
    case "overperforming":
      return "green";
    default:
      return "neutral";
  }
}

export function categoryLabel(category: Category): string {
  switch (category) {
    case "high priority":
      return "High Priority";
    case "moderate":
      return "Moderate";
    case "on track":
      return "On Track";
    case "overperforming":
      return "Overperforming";
    case "awaiting performance":
      return "Awaiting Performance";
    case "awaiting data":
      return "Awaiting Data";
    case "insufficient data":
      return "Insufficient Data";
  }
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateInClubTz(d);
}

export function fmt1(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(1);
}

export function fmtSigned1(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const s = n.toFixed(1);
  return n > 0 ? `+${s}` : s;
}

/** Signed percentage change from a baseline to a current value — goes negative on decline. */
export function fmtSignedPercent(current: number | null | undefined, baseline: number | null | undefined): string {
  if (current === null || current === undefined || !baseline) return "—";
  const pct = ((current - baseline) / baseline) * 100;
  const s = pct.toFixed(1);
  return pct > 0 ? `+${s}%` : `${s}%`;
}

/** Age in whole years from a birth year — Hawkin (and this app) never store more precision than that. */
export function ageFromBirthYear(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export const METRIC_LABELS: Record<string, string> = {
  pp: "Peak Power",
  ppbm: "Peak Power / BM",
  ci: "Concentric Impulse",
  brfd: "Braking RFD",
  mrsi: "mRSI",
  mph: "Performance",
};

export const METRIC_UNITS: Record<string, string> = {
  pp: "W",
  ppbm: "W/kg",
  ci: "N·s",
  brfd: "N/s",
  mrsi: "",
  mph: "mph",
};
