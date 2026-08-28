import { describe, expect, it } from "vitest";
import { computeRoster, type RawAthleteInput } from "../prediction";

function athlete(overrides: Partial<RawAthleteInput> & { id: string; name: string }): RawAthleteInput {
  return {
    sex: null,
    birthYear: null,
    pp: 0,
    ppbm: 0,
    ci: 0,
    brfd: 0,
    mrsi: 0,
    mph: 0,
    predOverride: null,
    ...overrides,
  };
}

// A small, hand-checkable roster, clean numbers.
// pp values are chosen so the pp-regression slope/intercept are easy to verify by hand.
const KNOWN_ROSTER: RawAthleteInput[] = [
  athlete({ id: "a", name: "Alice", pp: 5000, ppbm: 60, ci: 250, brfd: 4000, mrsi: 0.9, mph: 90 }),
  athlete({ id: "b", name: "Bob", pp: 5500, ppbm: 65, ci: 270, brfd: 4200, mrsi: 1.0, mph: 92 }),
  athlete({ id: "c", name: "Cara", pp: 4500, ppbm: 55, ci: 230, brfd: 3800, mrsi: 0.8, mph: 86 }),
  athlete({ id: "d", name: "Dax", pp: 4800, ppbm: 58, ci: 240, brfd: 3900, mrsi: 0.85, mph: 88 }),
];

describe("computeRoster — known roster snapshot", () => {
  it("pins predictions/gaps/categories for a hand-checkable roster", () => {
    const result = computeRoster(KNOWN_ROSTER);
    const summary = result.map((a) => ({
      id: a.id,
      pred: a.pred,
      gap: a.gap,
      category: a.category,
      hasPlateData: a.hasPlateData,
      hasPerformance: a.hasPerformance,
    }));
    expect(summary).toMatchInlineSnapshot(`
      [
        {
          "category": "on track",
          "gap": 0.6,
          "hasPerformance": true,
          "hasPlateData": true,
          "id": "a",
          "pred": 89.4,
        },
        {
          "category": "high priority",
          "gap": -3.1,
          "hasPerformance": true,
          "hasPlateData": true,
          "id": "b",
          "pred": 95.1,
        },
        {
          "category": "on track",
          "gap": 1.7,
          "hasPerformance": true,
          "hasPlateData": true,
          "id": "c",
          "pred": 84.3,
        },
        {
          "category": "on track",
          "gap": 0.7,
          "hasPerformance": true,
          "hasPlateData": true,
          "id": "d",
          "pred": 87.3,
        },
      ]
    `);
  });
});

describe("computeRoster — cold start guards", () => {
  it("returns nulls for an empty roster", () => {
    const result = computeRoster([]);
    expect(result).toEqual([]);
  });

  it("returns insufficient data for a single athlete (denominator undefined)", () => {
    const result = computeRoster([
      athlete({ id: "a", name: "Alice", pp: 5000, ppbm: 60, ci: 250, mph: 90 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].pred).toBeNull();
    expect(result[0].gap).toBeNull();
    expect(result[0].category).toBe("insufficient data");
    expect(Number.isNaN(result[0].pred)).toBe(false);
  });

  it("returns insufficient data when all fit-eligible athletes share identical values (zero variance)", () => {
    const result = computeRoster([
      athlete({ id: "a", name: "Alice", pp: 5000, ppbm: 60, ci: 250, mph: 90 }),
      athlete({ id: "b", name: "Bob", pp: 5000, ppbm: 60, ci: 250, mph: 90 }),
    ]);
    for (const a of result) {
      expect(a.pred).toBeNull();
      expect(a.gap).toBeNull();
      expect(a.category).toBe("insufficient data");
    }
  });

  it("never lets NaN reach the output", () => {
    const result = computeRoster([
      athlete({ id: "a", name: "Alice", pp: 5000, ppbm: 60, ci: 250, mph: 90 }),
      athlete({ id: "b", name: "Bob", pp: 5000, ppbm: 60, ci: 250, mph: 90 }),
      athlete({ id: "c", name: "Cara" }), // fully empty
    ]);
    for (const a of result) {
      expect(Number.isNaN(a.pred)).toBe(false);
      expect(Number.isNaN(a.gap)).toBe(false);
    }
  });
});

describe("computeRoster — plate-data-but-no-performance athlete", () => {
  const roster: RawAthleteInput[] = [
    ...KNOWN_ROSTER,
    athlete({ id: "e", name: "Evan", pp: 5200, ppbm: 62, ci: 260, brfd: 4100, mrsi: 0.95, mph: 0 }),
  ];
  const result = computeRoster(roster);
  const evan = result.find((a) => a.id === "e")!;

  it("produces a predicted value but no gap", () => {
    expect(evan.hasPlateData).toBe(true);
    expect(evan.hasPerformance).toBe(false);
    expect(evan.pred).not.toBeNull();
    expect(evan.gap).toBeNull();
    expect(evan.category).toBe("awaiting performance");
  });

  it("does not let a zero-mph placeholder masquerade as a large negative gap", () => {
    expect(evan.category).not.toBe("high priority");
  });

  it("is excluded from the fit set (does not distort peers' predictions)", () => {
    // Alice's prediction should be unchanged whether or not Evan (mph=0) is present.
    const withoutEvan = computeRoster(KNOWN_ROSTER);
    const alice = result.find((a) => a.id === "a")!;
    const aliceWithoutEvan = withoutEvan.find((a) => a.id === "a")!;
    expect(alice.pred).toBe(aliceWithoutEvan.pred);
  });
});

describe("computeRoster — athlete added with no force-plate data yet", () => {
  const roster: RawAthleteInput[] = [
    ...KNOWN_ROSTER,
    athlete({ id: "f", name: "Finn", mph: 89 }), // pp/ppbm/ci all 0
  ];
  const result = computeRoster(roster);
  const finn = result.find((a) => a.id === "f")!;

  it("gets no prediction and is held out of the fit set", () => {
    expect(finn.hasPlateData).toBe(false);
    expect(finn.pred).toBeNull();
    expect(finn.gap).toBeNull();
    expect(finn.category).toBe("awaiting data");
  });
});

describe("computeRoster — manual override", () => {
  it("overrides the model prediction and is flagged as manual", () => {
    const roster: RawAthleteInput[] = [
      ...KNOWN_ROSTER,
      athlete({ id: "g", name: "Gale", pp: 5100, ppbm: 61, ci: 255, mph: 91, predOverride: 95 }),
    ];
    const result = computeRoster(roster);
    const gale = result.find((a) => a.id === "g")!;
    expect(gale.pred).toBe(95);
    expect(gale.isManualOverride).toBe(true);
    expect(gale.gap).toBe(round1(91 - 95));
  });
});

describe("computeRoster — bottom-quartile flags ignore unmeasured zeros", () => {
  it("never flags or ranks an athlete with value 0 on a metric", () => {
    const roster: RawAthleteInput[] = [
      ...KNOWN_ROSTER,
      athlete({ id: "h", name: "Hana", mph: 80 }), // brfd/mrsi left at 0 (unmeasured)
    ];
    const result = computeRoster(roster);
    const hana = result.find((a) => a.id === "h")!;
    expect(hana.standings.brfd.rank).toBeNull();
    expect(hana.standings.brfd.percentile).toBeNull();
    expect(hana.standings.brfd.bottomQuartile).toBe(false);
  });

  it("ranks and can flag athletes who do have the metric measured", () => {
    const result = computeRoster(KNOWN_ROSTER);
    const cara = result.find((a) => a.id === "c")!; // lowest pp in the roster
    expect(cara.standings.pp.rank).toBe(4);
    expect(cara.standings.pp.total).toBe(4);
    expect(cara.standings.pp.bottomQuartile).toBe(true);
  });
});

function round1(n: number): number {
  return parseFloat(n.toFixed(1));
}

// Nine well-behaved athletes plus one extreme (mph=60 against a cluster of 88-94)
// with an otherwise unremarkable pp — extreme on one metric only.
const NORMAL_NINE: RawAthleteInput[] = [
  athlete({ id: "n1", name: "N1", pp: 5000, ppbm: 60, ci: 250, brfd: 4000, mrsi: 0.9, mph: 88 }),
  athlete({ id: "n2", name: "N2", pp: 5100, ppbm: 61, ci: 255, brfd: 4050, mrsi: 0.91, mph: 89 }),
  athlete({ id: "n3", name: "N3", pp: 5200, ppbm: 62, ci: 260, brfd: 4100, mrsi: 0.92, mph: 90 }),
  athlete({ id: "n4", name: "N4", pp: 5200, ppbm: 62, ci: 260, brfd: 4100, mrsi: 0.92, mph: 90 }),
  athlete({ id: "n5", name: "N5", pp: 5300, ppbm: 63, ci: 265, brfd: 4150, mrsi: 0.93, mph: 91 }),
  athlete({ id: "n6", name: "N6", pp: 5300, ppbm: 63, ci: 265, brfd: 4150, mrsi: 0.93, mph: 91 }),
  athlete({ id: "n7", name: "N7", pp: 5400, ppbm: 64, ci: 270, brfd: 4200, mrsi: 0.94, mph: 92 }),
  athlete({ id: "n8", name: "N8", pp: 5500, ppbm: 65, ci: 275, brfd: 4250, mrsi: 0.95, mph: 93 }),
  athlete({ id: "n9", name: "N9", pp: 5600, ppbm: 66, ci: 280, brfd: 4300, mrsi: 0.96, mph: 94 }),
];
const OUTLIER = athlete({ id: "o1", name: "Outlier", pp: 5250, ppbm: 62, ci: 262, brfd: 4125, mrsi: 0.92, mph: 60 });

describe("computeRoster — outlier exclusion from the fit set", () => {
  const withOutlier = computeRoster([...NORMAL_NINE, OUTLIER]);
  const withoutOutlier = computeRoster(NORMAL_NINE);
  const outlierResult = withOutlier.find((a) => a.id === "o1")!;

  it("flags the extreme athlete as excluded from the fit", () => {
    expect(outlierResult.excludedFromFit).toBe(true);
  });

  it("still predicts, ranks, and displays the excluded athlete normally", () => {
    expect(outlierResult.pred).not.toBeNull();
    expect(outlierResult.hasPlateData).toBe(true);
    expect(outlierResult.hasPerformance).toBe(true);
    expect(outlierResult.gap).not.toBeNull();
    expect(outlierResult.standings.pp.rank).not.toBeNull();
  });

  it("does not tilt predictions for the other nine athletes", () => {
    for (const n of NORMAL_NINE) {
      const withOutlierPred = withOutlier.find((a) => a.id === n.id)!.pred;
      const withoutOutlierPred = withoutOutlier.find((a) => a.id === n.id)!.pred;
      expect(withOutlierPred).toBe(withoutOutlierPred);
    }
  });

  it("none of the well-behaved nine are themselves flagged", () => {
    for (const n of NORMAL_NINE) {
      expect(withOutlier.find((a) => a.id === n.id)!.excludedFromFit).toBe(false);
    }
  });
});

describe("computeRoster — outlier exclusion never drops the fit set below MIN_FIT_SIZE", () => {
  it("excludes no one when the candidate set is already at the floor (8)", () => {
    const eightWithOneExtreme = [...NORMAL_NINE.slice(0, 7), OUTLIER];
    const result = computeRoster(eightWithOneExtreme);
    for (const a of result) {
      expect(a.excludedFromFit).toBe(false);
    }
  });
});

describe("computeRoster — outlier exclusion is capped at ~10% of the fit set", () => {
  it("excludes at most floor(10%) even when more athletes look extreme", () => {
    // 20 well-behaved athletes (clean linear cluster) plus 4 extremes.
    const clean: RawAthleteInput[] = [];
    for (let i = 0; i < 20; i++) {
      const mph = 85 + i * 0.5;
      clean.push(
        athlete({
          id: `c${i}`,
          name: `C${i}`,
          pp: 5000 + i * 20,
          ppbm: 60 + i * 0.2,
          ci: 250 + i * 2,
          brfd: 4000 + i * 10,
          mrsi: 0.9,
          mph,
        }),
      );
    }
    const extremes: RawAthleteInput[] = [
      athlete({ id: "e1", name: "E1", pp: 5100, ppbm: 61, ci: 255, brfd: 4050, mrsi: 0.9, mph: 20 }),
      athlete({ id: "e2", name: "E2", pp: 5100, ppbm: 61, ci: 255, brfd: 4050, mrsi: 0.9, mph: 25 }),
      athlete({ id: "e3", name: "E3", pp: 5100, ppbm: 61, ci: 255, brfd: 4050, mrsi: 0.9, mph: 30 }),
      athlete({ id: "e4", name: "E4", pp: 5100, ppbm: 61, ci: 255, brfd: 4050, mrsi: 0.9, mph: 40 }),
    ];

    const result = computeRoster([...clean, ...extremes]);
    const excludedCount = result.filter((a) => a.excludedFromFit).length;

    // candidate set = 24, floor(24 * 0.10) = 2
    expect(excludedCount).toBe(2);
    // the two most extreme (lowest mph) are the ones held out
    expect(result.find((a) => a.id === "e1")!.excludedFromFit).toBe(true);
    expect(result.find((a) => a.id === "e2")!.excludedFromFit).toBe(true);
    expect(result.find((a) => a.id === "e3")!.excludedFromFit).toBe(false);
    expect(result.find((a) => a.id === "e4")!.excludedFromFit).toBe(false);
  });
});

describe("computeRoster — sex-aware re-centering", () => {
  // No age group for anyone (birthYear unset), so age-group grouping can't
  // kick in and this exercises sex-only grouping. Males cluster high-pp/high-mph, females low-pp/low-mph, with a
  // genuine within-group slope difference from the pooled line — exactly the
  // shape that makes a sex-blind offset misfire. Hand-verified: pooling both
  // sexes into one offset flags every male "high priority" (gap -4.9 to -5.3)
  // while females read as fine-to-overperforming (gap +2.9 to +7.3); grouping
  // by sex first centers everyone near zero (-0.2 to +0.2 for males, -2.8 to
  // +2.8 for females).
  const roster: RawAthleteInput[] = [
    athlete({ id: "m1", name: "M1", sex: "Male", pp: 6000, ppbm: 60, ci: 300, brfd: 4200, mrsi: 0.9, mph: 95 }),
    athlete({ id: "m2", name: "M2", sex: "Male", pp: 6200, ppbm: 62, ci: 310, brfd: 4340, mrsi: 0.9, mph: 97 }),
    athlete({ id: "m3", name: "M3", sex: "Male", pp: 6400, ppbm: 64, ci: 320, brfd: 4480, mrsi: 0.9, mph: 99 }),
    athlete({ id: "f1", name: "F1", sex: "Female", pp: 4000, ppbm: 40, ci: 200, brfd: 2800, mrsi: 0.9, mph: 80 }),
    athlete({ id: "f2", name: "F2", sex: "Female", pp: 4200, ppbm: 42, ci: 210, brfd: 2940, mrsi: 0.9, mph: 84 }),
    athlete({ id: "f3", name: "F3", sex: "Female", pp: 4400, ppbm: 44, ci: 220, brfd: 3080, mrsi: 0.9, mph: 88 }),
  ];

  it("centers every athlete near zero when grouped by sex", () => {
    const result = computeRoster(roster);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId.m1.gap).toBe(0.2);
    expect(byId.m1.category).toBe("on track");
    expect(byId.m2.gap).toBe(0);
    expect(byId.m3.gap).toBe(-0.2);
    expect(byId.f1.gap).toBe(-2.8);
    expect(byId.f1.category).toBe("moderate");
    expect(byId.f2.gap).toBe(0);
    expect(byId.f3.gap).toBe(2.8);
  });

  it("without sex recorded, falls back to the full-pool grouping and misfires", () => {
    const sexBlind = roster.map((a) => ({ ...a, sex: null }));
    const result = computeRoster(sexBlind);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    // Every male wrongly flagged high priority when pooled with the female residuals.
    expect(byId.m1.gap).toBe(-4.9);
    expect(byId.m1.category).toBe("high priority");
    expect(byId.m2.category).toBe("high priority");
    expect(byId.m3.category).toBe("high priority");
    // Females wrongly read as fine-to-overperforming instead of needing attention.
    expect(byId.f1.gap).toBe(2.9);
    expect(byId.f3.gap).toBe(7.3);
    expect(byId.f3.category).toBe("overperforming");
  });

  it("dropping one female's sex label falls that whole side back to the mixed pool, unaffected men", () => {
    // f3 loses her sex label. Men are untouched (f3 was never in their pool).
    // But f1/f2 now have only ONE same-sex peer each (each other) — below the
    // >=2 floor — so THEY fall back to the full mixed pool too, reproducing
    // the old sex-blind numbers for f1/f2 even though f1 and f2 themselves
    // still have sex recorded. The floor applies to the peer pool size, not
    // to whether the athlete being scored has a sex value.
    const partial = roster.map((a) => (a.id === "f3" ? { ...a, sex: null } : a));
    const result = computeRoster(partial);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId.m1.gap).toBe(0.2);
    expect(byId.m2.gap).toBe(0);
    expect(byId.m3.gap).toBe(-0.2);
    expect(byId.f1.gap).toBe(2.9);
    expect(byId.f2.gap).toBe(5.1);
    expect(byId.f3.gap).toBe(7.3);
  });
});

// Birth years computed relative to "now" so these stay correct regardless of
// what year the suite runs in — a hardcoded birth year would silently drift
// into the wrong age group as time passes.
const CURRENT_YEAR = new Date().getFullYear();
const COLLEGE_PRO_BIRTH_YEAR = CURRENT_YEAR - 23; // age 23 -> College/Pro
const YOUTH_BIRTH_YEAR = CURRENT_YEAR - 14; // age 14 -> Youth (the boundary)

describe("computeRoster — age-group-aware re-centering", () => {
  // Mirrors the sex-aware fixture exactly (same pp/ppbm/ci/mph numbers), with
  // birth year standing in for sex as the grouping dimension, to confirm the
  // same leave-one-out mechanism produces the same fix for age-group bias
  // that it does for sex bias.
  const roster: RawAthleteInput[] = [
    athlete({ id: "cp1", name: "CP1", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6000, ppbm: 60, ci: 300, brfd: 4200, mrsi: 0.9, mph: 95 }),
    athlete({ id: "cp2", name: "CP2", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6200, ppbm: 62, ci: 310, brfd: 4340, mrsi: 0.9, mph: 97 }),
    athlete({ id: "cp3", name: "CP3", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6400, ppbm: 64, ci: 320, brfd: 4480, mrsi: 0.9, mph: 99 }),
    athlete({ id: "y1", name: "Y1", birthYear: YOUTH_BIRTH_YEAR, pp: 4000, ppbm: 40, ci: 200, brfd: 2800, mrsi: 0.9, mph: 80 }),
    athlete({ id: "y2", name: "Y2", birthYear: YOUTH_BIRTH_YEAR, pp: 4200, ppbm: 42, ci: 210, brfd: 2940, mrsi: 0.9, mph: 84 }),
    athlete({ id: "y3", name: "Y3", birthYear: YOUTH_BIRTH_YEAR, pp: 4400, ppbm: 44, ci: 220, brfd: 3080, mrsi: 0.9, mph: 88 }),
  ];

  it("centers every athlete near zero when grouped by age group", () => {
    const result = computeRoster(roster);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId.cp1.gap).toBe(0.2);
    expect(byId.cp1.category).toBe("on track");
    expect(byId.cp2.gap).toBe(0);
    expect(byId.cp3.gap).toBe(-0.2);
    expect(byId.y1.gap).toBe(-2.8);
    expect(byId.y1.category).toBe("moderate");
    expect(byId.y2.gap).toBe(0);
    expect(byId.y3.gap).toBe(2.8);
  });

  it("without birth year recorded, falls back to the full-pool grouping and misfires", () => {
    const blind = roster.map((a) => ({ ...a, birthYear: null }));
    const result = computeRoster(blind);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    // Every College/Pro athlete wrongly flagged high priority when pooled with youth residuals.
    expect(byId.cp1.gap).toBe(-4.9);
    expect(byId.cp1.category).toBe("high priority");
    expect(byId.cp2.category).toBe("high priority");
    expect(byId.cp3.category).toBe("high priority");
    // Youth wrongly read as fine-to-overperforming instead of needing attention.
    expect(byId.y1.gap).toBe(2.9);
    expect(byId.y3.gap).toBe(7.3);
    expect(byId.y3.category).toBe("overperforming");
  });

  it("dropping one youth's birth year falls that whole side back to the mixed pool, unaffected college/pro", () => {
    const partial = roster.map((a) => (a.id === "y3" ? { ...a, birthYear: null } : a));
    const result = computeRoster(partial);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId.cp1.gap).toBe(0.2);
    expect(byId.cp2.gap).toBe(0);
    expect(byId.cp3.gap).toBe(-0.2);
    expect(byId.y1.gap).toBe(2.9);
    expect(byId.y2.gap).toBe(5.1);
    expect(byId.y3.gap).toBe(7.3);
  });
});

describe("computeRoster — combined sex + age-group re-centering", () => {
  it("prefers the same-sex-and-age-group pool over the same-sex-only pool when it's big enough", () => {
    // Everyone shares sex="Male", so a same-sex-only pool would just be
    // everyone (identical to no grouping at all) — if the code incorrectly
    // skipped the sex+age-group intersection, this would reproduce the
    // blind-pool misfire instead of centering near zero.
    const roster: RawAthleteInput[] = [
      athlete({ id: "a", name: "A", sex: "Male", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6000, ppbm: 60, ci: 300, brfd: 4200, mrsi: 0.9, mph: 95 }),
      athlete({ id: "b", name: "B", sex: "Male", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6200, ppbm: 62, ci: 310, brfd: 4340, mrsi: 0.9, mph: 97 }),
      athlete({ id: "c", name: "C", sex: "Male", birthYear: COLLEGE_PRO_BIRTH_YEAR, pp: 6400, ppbm: 64, ci: 320, brfd: 4480, mrsi: 0.9, mph: 99 }),
      athlete({ id: "d", name: "D", sex: "Male", birthYear: YOUTH_BIRTH_YEAR, pp: 4000, ppbm: 40, ci: 200, brfd: 2800, mrsi: 0.9, mph: 80 }),
      athlete({ id: "e", name: "E", sex: "Male", birthYear: YOUTH_BIRTH_YEAR, pp: 4200, ppbm: 42, ci: 210, brfd: 2940, mrsi: 0.9, mph: 84 }),
      athlete({ id: "f", name: "F", sex: "Male", birthYear: YOUTH_BIRTH_YEAR, pp: 4400, ppbm: 44, ci: 220, brfd: 3080, mrsi: 0.9, mph: 88 }),
    ];
    const result = computeRoster(roster);
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId.a.gap).toBe(0.2);
    expect(byId.a.category).toBe("on track");
    expect(byId.b.gap).toBe(0);
    expect(byId.c.gap).toBe(-0.2);
    expect(byId.d.gap).toBe(-2.8);
    expect(byId.d.category).toBe("moderate");
    expect(byId.e.gap).toBe(0);
    expect(byId.f.gap).toBe(2.8);
  });
});
