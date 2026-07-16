import type { EventKind, PhysicalObstacleKind, RafficaType } from "./types";

export type PatternTier = 1 | 2 | 3 | 4;
export type PatternCategory = "bonus" | "malus" | "mixed";

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
  mobileLine?: 0 | 1 | 2;
};

type MixedShape = "low" | "middle" | "high" | "rise" | "fall" | "arc" | "zigzag" | "choice";

const e = (kind: EventKind, x: number, line: 0 | 1 | 2): PatternItem => ({ type: "event", kind, x, line });
const o = (kind: PhysicalObstacleKind, x: number): PatternItem => ({ type: "physical", kind, x });
const p = (id: string, category: PatternCategory, tier: PatternTier, recovery: number, items: PatternItem[]): GameplayPattern => ({ id, category, tier, recovery, items });

const SHAPES: Record<MixedShape, readonly [number, 0 | 1 | 2][]> = {
  low: [[0,0],[82,0],[164,0]],
  middle: [[0,1],[82,1],[164,1]],
  high: [[0,2],[82,2],[164,2]],
  rise: [[0,0],[82,1],[164,2]],
  fall: [[0,2],[82,1],[164,0]],
  arc: [[0,0],[78,2],[156,0]],
  zigzag: [[0,0],[82,2],[164,1]],
  choice: [[0,1],[94,0],[188,2]],
};

function mix(
  id: string,
  tier: PatternTier,
  kinds: readonly [EventKind, EventKind, EventKind],
  shape: MixedShape,
  obstacle?: { kind: PhysicalObstacleKind; x: number }
) {
  const points = SHAPES[shape];
  const items = kinds.map((kind, index) => e(kind, points[index][0], points[index][1]));
  if (obstacle) items.push(o(obstacle.kind, obstacle.x));
  return p(id, "mixed", tier, 0.78 + tier * 0.1, items);
}

// I pattern puri Bonus contengono soltanto Assist e Clean Sheet.
export const BONUS_PATTERNS: readonly GameplayPattern[] = [
  p("bonus-assist-bassi", "bonus", 1, .62, [e("assist",0,0),e("assist",58,0)]),
  p("bonus-clean-medi", "bonus", 1, .64, [e("cleanSheet",0,1),e("cleanSheet",58,1)]),
  p("bonus-salita", "bonus", 2, .7, [e("assist",0,0),e("cleanSheet",68,1),e("assist",136,2)]),
  p("bonus-discesa", "bonus", 2, .7, [e("cleanSheet",0,2),e("assist",68,1),e("cleanSheet",136,0)]),
  p("bonus-arco", "bonus", 2, .74, [e("assist",0,0),e("cleanSheet",68,2),e("assist",136,0)]),
  p("bonus-zigzag", "bonus", 3, .8, [e("cleanSheet",0,0),e("assist",72,2),e("cleanSheet",144,1)]),
  p("bonus-due-linee", "bonus", 3, .84, [e("assist",0,0),e("assist",58,0),e("cleanSheet",158,2)]),
  p("bonus-onda", "bonus", 4, .9, [e("cleanSheet",0,1),e("assist",64,2),e("cleanSheet",128,1),e("assist",192,0)]),
  p("bonus-percorso", "bonus", 4, .94, [e("assist",0,0),e("cleanSheet",68,1),e("assist",136,2),e("cleanSheet",204,0)]),
] as const;

// I pattern puri Malus sono pressione leggera: soltanto ammonizioni.
export const MALUS_PATTERNS: readonly GameplayPattern[] = [
  p("malus-giallo-basso", "malus", 1, .66, [e("yellowCard",0,0),e("yellowCard",58,0)]),
  p("malus-giallo-medio", "malus", 1, .68, [e("yellowCard",0,1),e("yellowCard",58,1)]),
  p("malus-giallo-alto", "malus", 2, .7, [e("yellowCard",0,2),e("yellowCard",58,2)]),
  p("malus-giallo-salita", "malus", 2, .74, [e("yellowCard",0,0),e("yellowCard",68,1),e("yellowCard",136,2)]),
  p("malus-giallo-discesa", "malus", 2, .74, [e("yellowCard",0,2),e("yellowCard",68,1),e("yellowCard",136,0)]),
  p("malus-giallo-arco", "malus", 3, .8, [e("yellowCard",0,0),e("yellowCard",64,2),e("yellowCard",128,0)]),
  p("malus-giallo-zigzag", "malus", 3, .82, [e("yellowCard",0,0),e("yellowCard",70,2),e("yellowCard",140,1)]),
  p("malus-giallo-doppia-linea", "malus", 4, .88, [e("yellowCard",0,0),e("yellowCard",58,0),e("yellowCard",158,2),e("yellowCard",216,2)]),
  p("malus-giallo-onda", "malus", 4, .92, [e("yellowCard",0,1),e("yellowCard",62,2),e("yellowCard",124,1),e("yellowCard",186,0)]),
] as const;

// I pattern Misti con eventi mantengono un Bonus ogni due Malus; gli altri sono
// sequenze fisiche prefabbricate che riportano le barriere nel ritmo di base.
export const MIXED_PATTERNS: readonly GameplayPattern[] = [
  p("misto-barriera-singola", "mixed", 1, .82, [o("cornerFlag",0)]),
  p("misto-barriera-bonus-alto", "mixed", 1, .9, [o("cornerFlag",0),e("assist",180,2),e("yellowCard",270,0),e("concededGoal",350,1)]),
  p("misto-bonus-prima-barriera", "mixed", 1, .92, [e("cleanSheet",0,1),e("yellowCard",82,0),o("cornerFlag",220),e("redCard",370,2)]),
  p("misto-barriera-ammonizione", "mixed", 1, .94, [o("var",0),e("yellowCard",190,0),e("assist",275,2),e("concededGoal",365,1)]),
  p("misto-due-barriere", "mixed", 1, 1.08, [o("cornerFlag",0),o("var",520)]),
  p("misto-barriera-barella", "mixed", 1, 1.12, [o("cornerFlag",0),o("stretcher",430)]),
  p("misto-barriera-scivolata", "mixed", 1, 1.14, [o("var",0),o("slidingTackle",450)]),
  p("misto-barriera-percorso-alternativo", "mixed", 1, 1, [o("stretcher",0),e("assist",320,2),e("yellowCard",405,0),e("ownGoal",500,1)]),

  mix("misto-subito-gol-rosso",2,["concededGoal","goal","redCard"],"rise",{kind:"cornerFlag",x:340}),
  mix("misto-giallo-gol-rigore",2,["yellowCard","goal","missedPenalty"],"fall",{kind:"stretcher",x:360}),
  mix("misto-autogol-clean-giallo-2",2,["ownGoal","cleanSheet","yellowCard"],"arc",{kind:"var",x:350}),
  mix("misto-rosso-assist-subito",2,["redCard","assist","concededGoal"],"zigzag",{kind:"slidingTackle",x:370}),
  mix("misto-rigore-assist-giallo",2,["missedPenalty","assist","yellowCard"],"choice"),
  mix("misto-giallo-gol-autogol",2,["yellowCard","goal","ownGoal"],"middle"),
  mix("misto-subito-clean-rigore",2,["concededGoal","cleanSheet","missedPenalty"],"low"),
  mix("misto-rosso-gol-giallo",2,["redCard","goal","yellowCard"],"high"),

  mix("misto-autogol-gol-rosso",3,["ownGoal","goal","redCard"],"rise",{kind:"cornerFlag",x:330}),
  mix("misto-rigore-clean-subito",3,["missedPenalty","cleanSheet","concededGoal"],"fall"),
  mix("misto-rosso-tripletta-giallo",3,["redCard","hatTrick","yellowCard"],"choice"),
  mix("misto-subito-assist-autogol",3,["concededGoal","assist","ownGoal"],"arc",{kind:"stretcher",x:350}),
  mix("misto-giallo-gol-rosso-3",3,["yellowCard","goal","redCard"],"zigzag"),
  mix("misto-autogol-clean-rigore",3,["ownGoal","cleanSheet","missedPenalty"],"middle"),
  mix("misto-rosso-assist-autogol",3,["redCard","assist","ownGoal"],"high",{kind:"var",x:360}),
  mix("misto-rigore-gol-giallo",3,["missedPenalty","goal","yellowCard"],"low"),

  mix("misto-subito-tripletta-rosso",4,["concededGoal","hatTrick","redCard"],"choice",{kind:"slidingTackle",x:380}),
  mix("misto-rigore-gol-autogol",4,["missedPenalty","goal","ownGoal"],"rise"),
  mix("misto-rosso-clean-rigore",4,["redCard","cleanSheet","missedPenalty"],"fall",{kind:"stretcher",x:390}),
  mix("misto-autogol-tripletta-giallo",4,["ownGoal","hatTrick","yellowCard"],"arc"),
  mix("misto-subito-gol-rigore",4,["concededGoal","goal","missedPenalty"],"zigzag",{kind:"var",x:400}),
  mix("misto-rosso-assist-subito-4",4,["redCard","assist","concededGoal"],"middle"),
  mix("misto-rigore-clean-rosso",4,["missedPenalty","cleanSheet","redCard"],"high",{kind:"cornerFlag",x:370}),
  mix("misto-autogol-gol-subito",4,["ownGoal","goal","concededGoal"],"low"),
] as const;

export const GAMEPLAY_PATTERNS = [...BONUS_PATTERNS, ...MALUS_PATTERNS, ...MIXED_PATTERNS] as const;

export const RAFFICA_PATTERN_LIBRARY: Record<RafficaType, readonly (readonly RafficaBeat[])[]> = {
  bonus: [
    [
      { kind:"assist",count:3,line:1,spacing:2,intervalAfter:.9 },
      { kind:"goal",count:1,line:2,spacing:0,intervalAfter:.85 },
      { kind:"cleanSheet",count:2,line:0,spacing:2,intervalAfter:.42 },
      { kind:"hatTrick",count:1,line:2,spacing:0,intervalAfter:1.25 },
    ],
    [
      { kind:"cleanSheet",count:2,line:0,spacing:2,intervalAfter:1.05 },
      { kind:"assist",count:2,line:1,spacing:2,intervalAfter:.82 },
      { kind:"cleanSheet",count:2,line:2,spacing:2,intervalAfter:.5 },
      { kind:"hatTrick",count:1,line:0,spacing:0,intervalAfter:1.3 },
    ],
  ],
  malus: [
    [
      { kind:"yellowCard",count:4,line:0,mobileLine:0,spacing:2,intervalAfter:.72 },
      { kind:"concededGoal",count:3,line:1,mobileLine:2,spacing:2,intervalAfter:.76 },
      { kind:"redCard",count:3,line:2,mobileLine:0,spacing:2,intervalAfter:.78 },
      { kind:"missedPenalty",count:2,line:0,mobileLine:2,spacing:16,intervalAfter:.96 },
    ],
    [
      { kind:"concededGoal",count:3,line:1,mobileLine:2,spacing:2,intervalAfter:.74 },
      { kind:"yellowCard",count:4,line:0,mobileLine:0,spacing:2,intervalAfter:.72 },
      { kind:"redCard",count:3,line:2,mobileLine:2,spacing:2,intervalAfter:.8 },
      { kind:"missedPenalty",count:2,line:1,mobileLine:0,spacing:16,intervalAfter:.98 },
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
  random = Math.random
) {
  const tier = getPatternTier(distance);
  const categories: PatternCategory[] = ["bonus", "malus", "mixed"];
  let cursor = random() * categories.reduce((total, category) => total + categoryWeights[category], 0);
  let category = categories[0];
  for (const candidate of categories) {
    cursor -= categoryWeights[candidate];
    if (cursor <= 0) { category = candidate; break; }
  }
  const candidates = GAMEPLAY_PATTERNS.filter((pattern) =>
    pattern.category === category && pattern.tier === tier && pattern.id !== previousId
  );
  return candidates[Math.floor(random() * candidates.length)] ?? GAMEPLAY_PATTERNS[0];
}

export function pickRafficaPattern(type: RafficaType, random = Math.random) {
  const patterns = RAFFICA_PATTERN_LIBRARY[type];
  return patterns[Math.floor(random() * patterns.length)];
}
