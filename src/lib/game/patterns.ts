import type { EventKind, PhysicalObstacleKind, RafficaType } from "./types";

export type PatternTier = 1 | 2 | 3 | 4;
export type PatternCategory = "bonus" | "malus" | "obstacle" | "mixed";

export type PatternItem =
  | { type: "event"; kind: EventKind; x: number; line: 0 | 1 | 2 }
  | { type: "physical"; kind: PhysicalObstacleKind; x: number };

export type GameplayPattern = {
  id: string;
  category: PatternCategory;
  tier: PatternTier;
  items: readonly PatternItem[];
  recovery: number;
};

export type RafficaBeat = {
  kind: EventKind;
  count: number;
  intervalAfter: number;
  spacing: number;
  line: 0 | 1 | 2;
};

const e = (kind: EventKind, x: number, line: 0 | 1 | 2): PatternItem => ({ type: "event", kind, x, line });
const o = (kind: PhysicalObstacleKind, x: number): PatternItem => ({ type: "physical", kind, x });
const p = (id: string, category: PatternCategory, tier: PatternTier, recovery: number, items: PatternItem[]): GameplayPattern => ({ id, category, tier, recovery, items });

// Coordinate intenzionalmente discrete: ogni sequenza è disegnata, non sorteggiata.
export const BONUS_PATTERNS: readonly GameplayPattern[] = [
  p("bonus-linea-bassa", "bonus", 1, .45, [e("assist",0,0),e("assist",58,0),e("assist",116,0)]),
  p("bonus-linea-media", "bonus", 1, .5, [e("cleanSheet",0,1),e("cleanSheet",58,1),e("cleanSheet",116,1)]),
  p("bonus-scaletta", "bonus", 1, .55, [e("assist",0,0),e("assist",68,1),e("goal",136,2)]),
  p("bonus-discesa", "bonus", 1, .55, [e("cleanSheet",0,2),e("cleanSheet",68,1),e("assist",136,0)]),
  p("bonus-doppia-scelta", "bonus", 2, .65, [e("assist",0,0),e("assist",58,0),e("goal",190,2)]),
  p("bonus-arco-corto", "bonus", 2, .65, [e("assist",0,0),e("cleanSheet",64,1),e("goal",128,2),e("cleanSheet",192,1),e("assist",256,0)]),
  p("bonus-zig-zag", "bonus", 2, .7, [e("assist",0,0),e("cleanSheet",70,2),e("assist",140,0),e("goal",210,2)]),
  p("bonus-due-corsie", "bonus", 2, .72, [e("cleanSheet",0,0),e("cleanSheet",58,0),e("assist",150,2),e("assist",208,2)]),
  p("bonus-onda", "bonus", 3, .76, [e("assist",0,1),e("assist",58,2),e("goal",116,1),e("cleanSheet",174,0),e("cleanSheet",232,1)]),
  p("bonus-arco-alto", "bonus", 3, .8, [e("cleanSheet",0,0),e("assist",62,1),e("goal",124,2),e("assist",186,1),e("cleanSheet",248,0)]),
  p("bonus-cambio-rotta", "bonus", 3, .82, [e("assist",0,2),e("assist",58,2),e("cleanSheet",150,0),e("cleanSheet",208,0),e("goal",300,1)]),
  p("bonus-tripletta-esca", "bonus", 3, .88, [e("cleanSheet",0,0),e("cleanSheet",58,0),e("cleanSheet",116,0),e("hatTrick",205,2)]),
  p("bonus-serpentina", "bonus", 4, .9, [e("assist",0,0),e("cleanSheet",58,1),e("assist",116,2),e("goal",174,1),e("cleanSheet",232,0)]),
  p("bonus-bivio", "bonus", 4, .95, [e("assist",0,0),e("assist",58,0),e("goal",150,2),e("cleanSheet",238,0),e("hatTrick",326,2)]),
  p("bonus-finale-tattico", "bonus", 4, 1, [e("assist",0,1),e("assist",58,1),e("assist",116,1),e("cleanSheet",205,0),e("cleanSheet",263,0),e("hatTrick",352,2)]),
] as const;

export const MALUS_PATTERNS: readonly GameplayPattern[] = [
  p("malus-gialli-bassi", "malus", 1, .52, [e("yellowCard",0,0),e("yellowCard",58,0),e("yellowCard",116,0)]),
  p("malus-gialli-medi", "malus", 1, .54, [e("yellowCard",0,1),e("yellowCard",58,1),e("yellowCard",116,1)]),
  p("malus-singolo", "malus", 1, .48, [e("concededGoal",0,0)]),
  p("malus-scaletta", "malus", 1, .58, [e("yellowCard",0,0),e("yellowCard",68,1),e("concededGoal",136,2)]),
  p("malus-doppia-linea", "malus", 2, .64, [e("yellowCard",0,0),e("yellowCard",58,0),e("concededGoal",150,1)]),
  p("malus-discesa", "malus", 2, .66, [e("concededGoal",0,2),e("yellowCard",68,1),e("yellowCard",136,0)]),
  p("malus-zig-zag", "malus", 2, .7, [e("yellowCard",0,0),e("concededGoal",70,2),e("yellowCard",140,0)]),
  p("malus-rosso-finale", "malus", 2, .74, [e("yellowCard",0,1),e("yellowCard",58,1),e("yellowCard",116,1),e("redCard",210,0)]),
  p("malus-onda", "malus", 3, .78, [e("yellowCard",0,0),e("concededGoal",62,1),e("yellowCard",124,2),e("ownGoal",205,1)]),
  p("malus-corridoio", "malus", 3, .8, [e("concededGoal",0,0),e("concededGoal",58,0),e("redCard",165,2)]),
  p("malus-due-raffiche", "malus", 3, .84, [e("yellowCard",0,0),e("yellowCard",58,0),e("yellowCard",116,0),e("concededGoal",220,1),e("concededGoal",278,1)]),
  p("malus-rigore-esca", "malus", 3, .86, [e("yellowCard",0,2),e("yellowCard",58,2),e("missedPenalty",165,0)]),
  p("malus-serpentina", "malus", 4, .92, [e("yellowCard",0,0),e("concededGoal",62,1),e("redCard",124,2),e("ownGoal",205,1),e("yellowCard",270,0)]),
  p("malus-pressione", "malus", 4, .96, [e("concededGoal",0,0),e("concededGoal",58,0),e("concededGoal",116,0),e("redCard",210,2)]),
  p("malus-finale", "malus", 4, 1, [e("yellowCard",0,1),e("yellowCard",58,1),e("yellowCard",116,1),e("missedPenalty",205,0),e("redCard",295,2)]),
] as const;

export const OBSTACLE_PATTERNS: readonly GameplayPattern[] = [
  p("ostacolo-bandierina", "obstacle", 1, .72, [o("cornerFlag",0)]),
  p("ostacolo-barella", "obstacle", 1, .76, [o("stretcher",0)]),
  p("ostacolo-var", "obstacle", 1, .78, [o("var",0)]),
  p("ostacolo-bandierine", "obstacle", 1, .9, [o("cornerFlag",0),o("cornerFlag",310)]),
  p("ostacolo-barella-bandiera", "obstacle", 2, 1, [o("stretcher",0),o("cornerFlag",330)]),
  p("ostacolo-var-bandiera", "obstacle", 2, 1.02, [o("var",0),o("cornerFlag",350)]),
  p("ostacolo-scivolata", "obstacle", 2, .88, [o("slidingTackle",0)]),
  p("ostacolo-barelle", "obstacle", 2, 1.08, [o("stretcher",0),o("stretcher",360)]),
  p("ostacolo-tris-basso", "obstacle", 3, 1.18, [o("cornerFlag",0),o("stretcher",330),o("cornerFlag",680)]),
  p("ostacolo-var-scivolata", "obstacle", 3, 1.12, [o("var",0),o("slidingTackle",380)]),
  p("ostacolo-barella-var", "obstacle", 3, 1.14, [o("stretcher",0),o("var",370)]),
  p("ostacolo-slalom", "obstacle", 3, 1.2, [o("cornerFlag",0),o("var",350),o("slidingTackle",720)]),
  p("ostacolo-pressione", "obstacle", 4, 1.28, [o("stretcher",0),o("slidingTackle",340),o("var",700)]),
  p("ostacolo-barelle-doppie", "obstacle", 4, 1.3, [o("stretcher",0),o("stretcher",330),o("cornerFlag",690)]),
  p("ostacolo-finale", "obstacle", 4, 1.34, [o("var",0),o("cornerFlag",330),o("stretcher",670),o("slidingTackle",1040)]),
] as const;

export const MIXED_PATTERNS: readonly GameplayPattern[] = [
  p("misto-salto-assist", "mixed", 1, .86, [o("cornerFlag",0),e("assist",170,1),e("assist",228,1)]),
  p("misto-barella-bonus", "mixed", 1, .9, [o("stretcher",0),e("cleanSheet",190,2)]),
  p("misto-var-giallo", "mixed", 2, .96, [o("var",0),e("yellowCard",190,0),e("assist",280,2)]),
  p("misto-bivio", "mixed", 2, 1, [e("goal",0,2),o("cornerFlag",145),e("cleanSheet",300,0)]),
  p("misto-scivolata-arco", "mixed", 2, 1.04, [o("slidingTackle",0),e("assist",180,0),e("goal",245,1),e("assist",310,2)]),
  p("misto-doppia-scelta", "mixed", 3, 1.08, [e("cleanSheet",0,0),o("stretcher",145),e("goal",320,2),e("yellowCard",390,0)]),
  p("misto-pressione", "mixed", 3, 1.12, [o("var",0),e("yellowCard",175,1),e("assist",250,2),o("cornerFlag",430)]),
  p("misto-corridoio", "mixed", 3, 1.16, [e("assist",0,0),e("assist",58,0),o("stretcher",190),e("goal",370,2)]),
  p("misto-serpentina", "mixed", 4, 1.22, [o("cornerFlag",0),e("assist",145,1),e("redCard",220,0),e("goal",300,2),o("slidingTackle",470)]),
  p("misto-finale", "mixed", 4, 1.3, [e("cleanSheet",0,0),o("var",150),e("yellowCard",330,1),e("hatTrick",430,2),o("stretcher",610)]),
] as const;

export const GAMEPLAY_PATTERNS = [
  ...BONUS_PATTERNS,
  ...MALUS_PATTERNS,
  ...OBSTACLE_PATTERNS,
  ...MIXED_PATTERNS,
] as const;

export const RAFFICA_PATTERN_LIBRARY: Record<RafficaType, readonly (readonly RafficaBeat[])[]> = {
  bonus: [
    [
      { kind:"assist",count:3,line:1,spacing:2,intervalAfter:.9 },
      { kind:"goal",count:1,line:2,spacing:0,intervalAfter:.85 },
      { kind:"cleanSheet",count:2,line:0,spacing:2,intervalAfter:.42 },
      { kind:"hatTrick",count:1,line:2,spacing:0,intervalAfter:1.25 },
    ],
    [
      { kind:"cleanSheet",count:2,line:0,spacing:2,intervalAfter:.9 },
      { kind:"assist",count:3,line:1,spacing:2,intervalAfter:.82 },
      { kind:"goal",count:1,line:2,spacing:0,intervalAfter:.44 },
      { kind:"hatTrick",count:1,line:0,spacing:0,intervalAfter:1.3 },
    ],
  ],
  malus: [
    [
      { kind:"yellowCard",count:3,line:0,spacing:2,intervalAfter:.82 },
      { kind:"concededGoal",count:3,line:1,spacing:2,intervalAfter:.86 },
      { kind:"redCard",count:2,line:2,spacing:2,intervalAfter:.88 },
      { kind:"missedPenalty",count:2,line:0,spacing:16,intervalAfter:1.05 },
    ],
    [
      { kind:"concededGoal",count:3,line:1,spacing:2,intervalAfter:.84 },
      { kind:"yellowCard",count:3,line:0,spacing:2,intervalAfter:.82 },
      { kind:"redCard",count:2,line:2,spacing:2,intervalAfter:.9 },
      { kind:"missedPenalty",count:2,line:1,spacing:16,intervalAfter:1.08 },
    ],
  ],
};

export function getPatternTier(distance: number): PatternTier {
  if (distance < 50) return 1;
  if (distance < 150) return 2;
  if (distance < 300) return 3;
  return 4;
}

export function pickGameplayPattern(
  distance: number,
  categoryWeights: Record<PatternCategory, number>,
  previousId: string | null,
  preferStretcher: boolean,
  random = Math.random
) {
  const tier = getPatternTier(distance);
  const categories: PatternCategory[] = ["bonus", "malus", "obstacle", "mixed"];
  let cursor = random() * categories.reduce((total, category) => total + categoryWeights[category], 0);
  let category = categories[0];
  for (const candidate of categories) {
    cursor -= categoryWeights[candidate];
    if (cursor <= 0) { category = candidate; break; }
  }
  let candidates = GAMEPLAY_PATTERNS.filter((pattern) =>
    pattern.category === category && pattern.tier === tier && pattern.id !== previousId
  );
  if (preferStretcher && category === "obstacle") {
    const stretcherPatterns = candidates.filter((pattern) => pattern.items.some((item) => item.type === "physical" && item.kind === "stretcher"));
    if (stretcherPatterns.length) candidates = stretcherPatterns;
  }
  return candidates[Math.floor(random() * candidates.length)] ?? GAMEPLAY_PATTERNS[0];
}

export function pickRafficaPattern(type: RafficaType, random = Math.random) {
  const patterns = RAFFICA_PATTERN_LIBRARY[type];
  return patterns[Math.floor(random() * patterns.length)];
}
