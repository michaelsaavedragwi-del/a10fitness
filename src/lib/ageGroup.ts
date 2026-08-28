/** Shared by the prediction model (peer re-centering) and the UI (filtering/display). */

export type AgeGroup = "Youth" | "High School" | "College/Pro";

export const AGE_GROUPS: AgeGroup[] = ["Youth", "High School", "College/Pro"];

/** 14 and under = Youth, 15-18 = High School, 19+ = College/Pro. Null when birth year isn't on file. */
export function ageGroupFromBirthYear(birthYear: number | null | undefined): AgeGroup | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  if (age <= 14) return "Youth";
  if (age <= 18) return "High School";
  return "College/Pro";
}
