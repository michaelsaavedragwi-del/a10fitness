export type RomFlag = "good" | "warning" | "red";

export interface RomSide {
  l: number;
  r: number;
  flag?: RomFlag;
  note?: string;
}

export interface RomAssessment {
  date: string;
  tests: Record<string, RomSide>;
}

export const JOINTS: { key: string; label: string; x: number; y: number }[] = [
  { key: "shoulder", label: "Shoulder (IR/ER)", x: 50, y: 90 },
  { key: "elbow", label: "Elbow", x: 50, y: 150 },
  { key: "wrist", label: "Wrist", x: 50, y: 200 },
  { key: "hip", label: "Hip (IR/ER)", x: 50, y: 240 },
  { key: "knee", label: "Knee", x: 50, y: 310 },
  { key: "ankle", label: "Ankle (DF)", x: 50, y: 370 },
];

/**
 * A bilateral joint flags only its worse (lower-ROM) side, unless the sides are
 * near-equal — in which case both flag. "Near-equal" is a 5% relative tolerance.
 */
export function sideFlags(side: RomSide): { l: boolean; r: boolean } {
  if (!side.flag || side.flag === "good") return { l: false, r: false };
  const { l, r } = side;
  if (l === 0 && r === 0) return { l: false, r: false };
  const diff = Math.abs(l - r);
  const tolerance = 0.05 * Math.max(l, r);
  if (diff <= tolerance) return { l: true, r: true };
  return l < r ? { l: true, r: false } : { l: false, r: true };
}

export function parseRom(json: unknown): RomAssessment | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (typeof obj.date !== "string" || typeof obj.tests !== "object" || obj.tests === null) return null;
  return obj as unknown as RomAssessment;
}
