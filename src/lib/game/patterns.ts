import type { EventKind, PhysicalObstacleKind, RafficaType } from "./types";
import { EARLY_GAME_END_METERS, INTRO_SAFE_END_METERS } from "./config";

export type PatternTier = 1 | 2 | 3 | 4;
export type PatternCategory = "bonus" | "malus" | "mixed";
export type PatternPhase = "introSafe" | "earlyGame" | "normal" | "advanced";

export type PatternItem =
  | { type: "event"; kind: EventKind; x: number; line: 0 | 1 | 2 }
  | { type: "physical"; kind: PhysicalObstacleKind; x: number };

export type GameplayPattern = {
  id: string;
  category: PatternCategory;
  tier: PatternTier;
  items: readonly PatternItem[];
  recovery: number;
  phases: readonly PatternPhase[];
};

export type RafficaBeat = {
  kind: EventKind;
  count: number;
  intervalAfter: number;
  spacing: number;
  line: 0 | 1 | 2;
  mobileLine?: 0 | 1 | 2;
};

export type BossPatternDifficulty = "medium" | "hard" | "extreme";
export type BossBlockType =
  | "shortBurst"
  | "mediumBurst"
  | "longBurst"
  | "fakePause"
  | "recoveryWindow"
  | "verticalSwitch"
  | "doubleWave"
  | "finalPressure";
export type BossBlock = {
  id: string;
  type: BossBlockType;
  difficulty: BossPatternDifficulty;
  beats: readonly RafficaBeat[];
  pauseOptions: readonly number[];
};
export type BossPattern = {
  id: string;
  difficulty: BossPatternDifficulty;
  beats: readonly RafficaBeat[];
  blockTypes: readonly BossBlockType[];
};

type MixedShape = "low" | "middle" | "high" | "rise" | "fall" | "arc" | "zigzag" | "choice";

const e = (kind: EventKind, x: number, line: 0 | 1 | 2): PatternItem => ({ type: "event", kind, x, line });
const o = (kind: PhysicalObstacleKind, x: number): PatternItem => ({ type: "physical", kind, x });
const p = (
  id: string,
  category: PatternCategory,
  tier: PatternTier,
  recovery: number,
  items: PatternItem[],
  phases: readonly PatternPhase[] = tier === 4 ? ["advanced"] : ["normal", "advanced"]
): GameplayPattern => ({ id, category, tier, recovery, items, phases });

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

export const INTRO_SAFE_PATTERNS: readonly GameplayPattern[] = [
  p("intro-assist-isolato", "bonus", 1, 1.02, [e("assist",0,0)], ["introSafe"]),
  p("intro-clean-isolato", "bonus", 1, 1.04, [e("cleanSheet",0,1)], ["introSafe"]),
  p("intro-bandierina-isolata", "mixed", 1, 1.18, [o("cornerFlag",0)], ["introSafe"]),
  p("intro-var-isolato", "mixed", 1, 1.22, [o("var",0)], ["introSafe"]),
  p("intro-bandierina-assist", "mixed", 1, 1.24, [o("cornerFlag",0),e("assist",260,2)], ["introSafe"]),
  p("intro-clean-bandierina", "mixed", 1, 1.26, [e("cleanSheet",0,1),o("cornerFlag",280)], ["introSafe"]),
  p("intro-assist-var", "mixed", 1, 1.28, [e("assist",0,0),o("var",290)], ["introSafe"]),
  p("intro-barella-isolata", "mixed", 1, 1.3, [o("stretcher",0)], ["introSafe"]),
  p("intro-assist-bandierina", "mixed", 1, 1.26, [e("assist",0,1),o("cornerFlag",285)], ["introSafe"]),
  p("intro-clean-var", "mixed", 1, 1.3, [e("cleanSheet",0,2),o("var",300)], ["introSafe"]),
  p("intro-bandierina-clean", "mixed", 1, 1.28, [o("cornerFlag",0),e("cleanSheet",275,2)], ["introSafe"]),
  p("intro-scivolata-isolata", "mixed", 1, 1.42, [o("slidingTackle",0)], ["introSafe"]),
] as const;

export const EARLY_GAME_PATTERNS: readonly GameplayPattern[] = [
  p("early-assist-clean", "bonus", 1, 1.02, [e("assist",0,0),e("cleanSheet",100,1)], ["earlyGame"]),
  p("early-clean-assist", "bonus", 1, 1.04, [e("cleanSheet",0,1),e("assist",108,2)], ["earlyGame"]),
  p("early-giallo-isolato", "malus", 1, 1.2, [e("yellowCard",0,0)], ["earlyGame"]),
  p("early-giallo-assist", "mixed", 1, 1.24, [e("yellowCard",0,0),e("assist",210,2)], ["earlyGame"]),
  p("early-bandierina", "mixed", 1, 1.18, [o("cornerFlag",0)], ["earlyGame"]),
  p("early-barella", "mixed", 1, 1.3, [o("stretcher",0)], ["earlyGame"]),
  p("early-var-clean", "mixed", 1, 1.32, [o("var",0),e("cleanSheet",270,2)], ["earlyGame"]),
  p("early-scivolata-preavviso", "mixed", 1, 1.5, [o("slidingTackle",0),e("assist",340,2)], ["earlyGame"]),
] as const;

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
  mix("misto-giallo-gol-rigore",2,["yellowCard","goal","missedPenalty"],"fall",{kind:"slidingTackle",x:380}),
  mix("misto-autogol-clean-giallo-2",2,["ownGoal","cleanSheet","yellowCard"],"arc",{kind:"var",x:350}),
  mix("misto-rosso-assist-subito",2,["redCard","assist","concededGoal"],"zigzag",{kind:"slidingTackle",x:370}),
  mix("misto-rigore-assist-giallo",2,["missedPenalty","assist","yellowCard"],"choice"),
  mix("misto-giallo-gol-autogol",2,["yellowCard","goal","ownGoal"],"middle"),
  mix("misto-subito-clean-rigore",2,["concededGoal","cleanSheet","missedPenalty"],"low"),
  mix("misto-rosso-gol-giallo",2,["redCard","goal","yellowCard"],"high"),

  mix("misto-autogol-gol-rosso",3,["ownGoal","goal","redCard"],"rise",{kind:"slidingTackle",x:390}),
  mix("misto-rigore-clean-subito",3,["missedPenalty","cleanSheet","concededGoal"],"fall",{kind:"slidingTackle",x:410}),
  mix("misto-rosso-tripletta-giallo",3,["redCard","hatTrick","yellowCard"],"choice"),
  mix("misto-subito-assist-autogol",3,["concededGoal","assist","ownGoal"],"arc",{kind:"stretcher",x:350}),
  mix("misto-giallo-gol-rosso-3",3,["yellowCard","goal","redCard"],"zigzag"),
  mix("misto-autogol-clean-rigore",3,["ownGoal","cleanSheet","missedPenalty"],"middle"),
  mix("misto-rosso-assist-autogol",3,["redCard","assist","ownGoal"],"high",{kind:"var",x:360}),
  mix("misto-rigore-gol-giallo",3,["missedPenalty","goal","yellowCard"],"low",{kind:"slidingTackle",x:400}),

  mix("misto-subito-tripletta-rosso",4,["concededGoal","hatTrick","redCard"],"choice",{kind:"slidingTackle",x:380}),
  mix("misto-rigore-gol-autogol",4,["missedPenalty","goal","ownGoal"],"rise",{kind:"slidingTackle",x:410}),
  mix("misto-rosso-clean-rigore",4,["redCard","cleanSheet","missedPenalty"],"fall",{kind:"stretcher",x:390}),
  mix("misto-autogol-tripletta-giallo",4,["ownGoal","hatTrick","yellowCard"],"arc",{kind:"slidingTackle",x:430}),
  mix("misto-subito-gol-rigore",4,["concededGoal","goal","missedPenalty"],"zigzag",{kind:"var",x:400}),
  mix("misto-rosso-assist-subito-4",4,["redCard","assist","concededGoal"],"middle",{kind:"slidingTackle",x:420}),
  mix("misto-rigore-clean-rosso",4,["missedPenalty","cleanSheet","redCard"],"high",{kind:"cornerFlag",x:370}),
  mix("misto-autogol-gol-subito",4,["ownGoal","goal","concededGoal"],"low"),
] as const;

export const GAMEPLAY_PATTERNS = [
  ...INTRO_SAFE_PATTERNS,
  ...EARLY_GAME_PATTERNS,
  ...BONUS_PATTERNS,
  ...MALUS_PATTERNS,
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
    [
      { kind:"yellowCard",count:5,line:0,mobileLine:0,spacing:2,intervalAfter:.48 },
      { kind:"redCard",count:3,line:2,mobileLine:2,spacing:4,intervalAfter:1.04 },
      { kind:"concededGoal",count:4,line:1,mobileLine:2,spacing:2,intervalAfter:.58 },
      { kind:"missedPenalty",count:2,line:0,mobileLine:0,spacing:20,intervalAfter:.88 },
    ],
    [
      { kind:"concededGoal",count:4,line:0,mobileLine:0,spacing:2,intervalAfter:.62 },
      { kind:"yellowCard",count:4,line:2,mobileLine:2,spacing:2,intervalAfter:.44 },
      { kind:"redCard",count:3,line:1,mobileLine:2,spacing:5,intervalAfter:1.08 },
      { kind:"missedPenalty",count:3,line:2,mobileLine:0,spacing:18,intervalAfter:.72 },
    ],
    [
      { kind:"redCard",count:3,line:1,mobileLine:2,spacing:4,intervalAfter:.86 },
      { kind:"yellowCard",count:5,line:0,mobileLine:0,spacing:2,intervalAfter:.5 },
      { kind:"missedPenalty",count:2,line:2,mobileLine:2,spacing:24,intervalAfter:1.12 },
      { kind:"concededGoal",count:4,line:1,mobileLine:0,spacing:2,intervalAfter:.56 },
    ],
    [
      { kind:"missedPenalty",count:2,line:0,mobileLine:0,spacing:22,intervalAfter:.92 },
      { kind:"concededGoal",count:3,line:2,mobileLine:2,spacing:3,intervalAfter:.46 },
      { kind:"yellowCard",count:4,line:1,mobileLine:0,spacing:2,intervalAfter:.74 },
      { kind:"redCard",count:3,line:2,mobileLine:2,spacing:5,intervalAfter:1.02 },
    ],
  ],
};

export const MOBILE_MALUS_RAFFICA_PATTERNS: readonly (readonly RafficaBeat[])[] = [
  [
    { kind:"yellowCard",count:4,line:0,mobileLine:0,spacing:7,intervalAfter:.9 },
    { kind:"concededGoal",count:3,line:2,mobileLine:2,spacing:8,intervalAfter:.68 },
    { kind:"redCard",count:3,line:2,mobileLine:2,spacing:9,intervalAfter:.92 },
    { kind:"missedPenalty",count:2,line:0,mobileLine:0,spacing:26,intervalAfter:1.02 },
  ],
  [
    { kind:"concededGoal",count:3,line:2,mobileLine:2,spacing:8,intervalAfter:.88 },
    { kind:"yellowCard",count:4,line:0,mobileLine:0,spacing:7,intervalAfter:.64 },
    { kind:"redCard",count:3,line:0,mobileLine:0,spacing:9,intervalAfter:.9 },
    { kind:"missedPenalty",count:2,line:2,mobileLine:2,spacing:28,intervalAfter:1.04 },
  ],
  [
    { kind:"redCard",count:3,line:0,mobileLine:0,spacing:9,intervalAfter:.62 },
    { kind:"yellowCard",count:4,line:0,mobileLine:0,spacing:7,intervalAfter:.94 },
    { kind:"concededGoal",count:3,line:2,mobileLine:2,spacing:8,intervalAfter:.66 },
    { kind:"missedPenalty",count:2,line:2,mobileLine:2,spacing:28,intervalAfter:1.06 },
  ],
  [
    { kind:"missedPenalty",count:2,line:2,mobileLine:2,spacing:28,intervalAfter:.9 },
    { kind:"yellowCard",count:3,line:0,mobileLine:0,spacing:8,intervalAfter:.7 },
    { kind:"concededGoal",count:3,line:0,mobileLine:0,spacing:9,intervalAfter:.92 },
    { kind:"redCard",count:3,line:2,mobileLine:2,spacing:10,intervalAfter:1.08 },
  ],
];

export const BOSS_BLOCK_LIBRARY: readonly BossBlock[] = [
  { id:"short-yellow",type:"shortBurst",difficulty:"medium",beats:[{kind:"yellowCard",count:3,line:0,spacing:7,intervalAfter:.54}],pauseOptions:[.08,.14,.2] },
  { id:"medium-conceded",type:"mediumBurst",difficulty:"medium",beats:[{kind:"concededGoal",count:4,line:1,spacing:6,intervalAfter:.58}],pauseOptions:[.1,.18,.26] },
  { id:"long-red",type:"longBurst",difficulty:"hard",beats:[{kind:"redCard",count:4,line:2,spacing:7,intervalAfter:.62}],pauseOptions:[.12,.2,.3] },
  { id:"fake-penalty",type:"fakePause",difficulty:"hard",beats:[{kind:"missedPenalty",count:1,line:0,spacing:26,intervalAfter:.42},{kind:"yellowCard",count:2,line:2,spacing:9,intervalAfter:.58}],pauseOptions:[.06,.12,.18] },
  { id:"recovery-cards",type:"recoveryWindow",difficulty:"medium",beats:[{kind:"yellowCard",count:2,line:1,spacing:10,intervalAfter:.62}],pauseOptions:[.34,.42,.5] },
  { id:"vertical-switch",type:"verticalSwitch",difficulty:"hard",beats:[{kind:"concededGoal",count:3,line:0,spacing:8,intervalAfter:.78},{kind:"redCard",count:3,line:2,spacing:9,intervalAfter:.66}],pauseOptions:[.12,.2,.28] },
  { id:"double-wave",type:"doubleWave",difficulty:"hard",beats:[{kind:"yellowCard",count:3,line:2,spacing:7,intervalAfter:.48},{kind:"concededGoal",count:3,line:1,spacing:8,intervalAfter:.64}],pauseOptions:[.16,.24,.32] },
  { id:"final-pressure",type:"finalPressure",difficulty:"extreme",beats:[{kind:"redCard",count:3,line:0,spacing:9,intervalAfter:.58},{kind:"missedPenalty",count:2,line:2,spacing:28,intervalAfter:.72}],pauseOptions:[.2,.3,.4] },
];

export const MOBILE_BOSS_BLOCK_LIBRARY: readonly BossBlock[] = [
  { id:"mobile-short-low",type:"shortBurst",difficulty:"medium",beats:[{kind:"yellowCard",count:3,line:0,mobileLine:0,spacing:9,intervalAfter:.72}],pauseOptions:[.16,.24,.32] },
  { id:"mobile-medium-high",type:"mediumBurst",difficulty:"medium",beats:[{kind:"concededGoal",count:3,line:2,mobileLine:2,spacing:10,intervalAfter:.76}],pauseOptions:[.18,.26,.34] },
  { id:"mobile-recovery",type:"recoveryWindow",difficulty:"medium",beats:[{kind:"yellowCard",count:2,line:0,mobileLine:0,spacing:12,intervalAfter:.76}],pauseOptions:[.4,.5,.58] },
  { id:"mobile-fake-pause",type:"fakePause",difficulty:"hard",beats:[{kind:"missedPenalty",count:1,line:2,mobileLine:2,spacing:30,intervalAfter:.88},{kind:"yellowCard",count:2,line:0,mobileLine:0,spacing:11,intervalAfter:.78}],pauseOptions:[.18,.28,.38] },
  { id:"mobile-vertical-switch",type:"verticalSwitch",difficulty:"hard",beats:[{kind:"concededGoal",count:3,line:0,mobileLine:0,spacing:10,intervalAfter:.9},{kind:"redCard",count:3,line:2,mobileLine:2,spacing:11,intervalAfter:.8}],pauseOptions:[.2,.3,.4] },
  { id:"mobile-double-wave",type:"doubleWave",difficulty:"extreme",beats:[{kind:"redCard",count:3,line:2,mobileLine:2,spacing:11,intervalAfter:.92},{kind:"concededGoal",count:3,line:0,mobileLine:0,spacing:12,intervalAfter:.84}],pauseOptions:[.28,.38,.48] },
];

export function getPatternTier(distance: number): PatternTier {
  if (distance < 50) return 1;
  if (distance < 150) return 2;
  if (distance < 300) return 3;
  return 4;
}

export function getPatternPhase(distance: number): PatternPhase {
  if (distance < INTRO_SAFE_END_METERS) return "introSafe";
  if (distance < EARLY_GAME_END_METERS) return "earlyGame";
  if (distance < 300) return "normal";
  return "advanced";
}

export function pickGameplayPattern(
  distance: number,
  categoryWeights: Record<PatternCategory, number>,
  previousId: string | null,
  random = Math.random
) {
  const tier = getPatternTier(distance);
  const phase = getPatternPhase(distance);
  const phasePatterns = GAMEPLAY_PATTERNS.filter((pattern) =>
    pattern.phases.includes(phase) && pattern.id !== previousId
  );
  const categories: PatternCategory[] = (["bonus", "malus", "mixed"] as const)
    .filter((category) => phasePatterns.some((pattern) => pattern.category === category));
  let cursor = random() * categories.reduce((total, category) => total + categoryWeights[category], 0);
  let category = categories[0];
  for (const candidate of categories) {
    cursor -= categoryWeights[candidate];
    if (cursor <= 0) { category = candidate; break; }
  }
  const candidates = phasePatterns.filter((pattern) =>
    pattern.category === category &&
    (phase === "introSafe" || phase === "earlyGame" || pattern.tier === tier)
  );
  return candidates[Math.floor(random() * candidates.length)] ?? phasePatterns[0] ?? GAMEPLAY_PATTERNS[0];
}

export function pickRafficaPattern(
  type: RafficaType,
  previousPattern: readonly RafficaBeat[] | null = null,
  mobile = false,
  speed = 0,
  random = Math.random
) {
  const patterns = mobile && type === "malus"
    ? MOBILE_MALUS_RAFFICA_PATTERNS.filter((pattern) =>
        validateMobileRafficaPattern(pattern, speed)
      )
    : RAFFICA_PATTERN_LIBRARY[type];
  const candidates = patterns.filter((pattern) => pattern !== previousPattern);
  return candidates[Math.floor(random() * candidates.length)] ?? patterns[0];
}

export function validateMobileRafficaPattern(
  pattern: readonly RafficaBeat[],
  speed: number
) {
  if (!pattern.length) return false;
  const projectileSpeed = Math.max(1, speed * 1.5);
  for (let index = 0; index < pattern.length; index += 1) {
    const beat = pattern[index];
    const line = beat.mobileLine ?? beat.line;
    if (line === 1 || beat.count > 4 || beat.count < 1 || beat.spacing < 6) return false;
    const next = pattern[index + 1];
    if (!next) continue;
    const nextLine = next.mobileLine ?? next.line;
    if (line === nextLine) continue;
    const estimatedHorizontalGap = beat.intervalAfter * projectileSpeed;
    const minimumLandingGap = projectileSpeed * 0.82;
    if (estimatedHorizontalGap < minimumLandingGap) return false;
  }
  return true;
}

export function pickBossPattern(
  previousPattern: BossPattern | null = null,
  mobile = false,
  speed = 0,
  random = Math.random,
  validationAttempt = 0
) {
  const library = mobile ? MOBILE_BOSS_BLOCK_LIBRARY : BOSS_BLOCK_LIBRARY;
  const blockCount = 4 + (random() > 0.58 ? 1 : 0);
  const selected: BossBlock[] = [];
  let lastKind: EventKind | null = null;
  let lastLine: 0 | 1 | 2 | null = null;
  let repeatedLine = 0;
  let hasExtreme = false;

  for (let slot = 0; slot < blockCount; slot += 1) {
    let candidates = library.filter((block) => {
      if (selected.at(-1)?.id === block.id) return false;
      if (block.difficulty === "extreme" && hasExtreme) return false;
      if (slot === 0 && previousPattern?.difficulty === "extreme" && block.difficulty !== "medium") return false;
      const firstBeat = block.beats[0];
      const firstLine = mobile ? firstBeat.mobileLine ?? firstBeat.line : firstBeat.line;
      if (lastKind === firstBeat.kind && selected.length > 0) return false;
      if (lastLine === firstLine && repeatedLine >= 2) return false;
      return !mobile || validateMobileBossBlock(block, speed);
    });
    if (!candidates.length) candidates = library.filter((block) => selected.at(-1)?.id !== block.id);
    const block = candidates[Math.floor(random() * candidates.length)] ?? library[0];
    selected.push(block);
    hasExtreme ||= block.difficulty === "extreme";
    for (const beat of block.beats) {
      const line = mobile ? beat.mobileLine ?? beat.line : beat.line;
      repeatedLine = line === lastLine ? repeatedLine + 1 : 1;
      lastLine = line;
      lastKind = beat.kind;
    }
  }

  const beats = selected.flatMap((block) => block.beats.map((beat, index) => ({
    ...beat,
    intervalAfter: beat.intervalAfter + (index === block.beats.length - 1
      ? block.pauseOptions[Math.floor(random() * block.pauseOptions.length)]
      : 0),
  })));
  const blockTypes = selected.map((block) => block.type);
  const difficulty: BossPatternDifficulty = hasExtreme
    ? "extreme"
    : selected.some((block) => block.difficulty === "hard") ? "hard" : "medium";
  let id = selected.map((block) => block.id).join("|");
  if (id === previousPattern?.id) {
    beats.reverse();
    blockTypes.reverse();
    id = `${id}|reverse`;
  }
  const pattern: BossPattern = { id, difficulty, beats, blockTypes };
  if (!mobile || validateMobileBossPattern(pattern, speed)) return pattern;
  if (validationAttempt < 7) {
    return pickBossPattern(previousPattern, mobile, speed, random, validationAttempt + 1);
  }
  return buildMobileBossFallback();
}

function validateMobileBossBlock(block: BossBlock, speed: number) {
  return validateMobileBossBeats(block.beats, speed);
}

export function validateMobileBossPattern(pattern: BossPattern, speed: number) {
  return pattern.blockTypes.length >= 4 && validateMobileBossBeats(pattern.beats, speed);
}

function validateMobileBossBeats(beats: readonly RafficaBeat[], speed: number) {
  // Deterministic approximation of the mobile runner physics: the player can
  // remain grounded or commit to a jump, but cannot crouch or reverse a jump.
  const speedProgress = Math.max(0, Math.min(1, (speed - 292) / (900 - 292)));
  const projectileSpeed = 340 + speedProgress * 75;
  const estimatedReactionTime = 360 / projectileSpeed;
  const minimumReactionTime = 0.64;
  const minimumLandingWindow = 0.84;
  const maximumContinuousAirWindow = 1.08;
  if (estimatedReactionTime < minimumReactionTime) return false;
  let continuousLowPressure = 0;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    const line = beat.mobileLine ?? beat.line;
    if (line === 1 || beat.count > 4 || beat.spacing < 8) return false;
    const groupSpan = ((beat.count - 1) * (58 + beat.spacing)) / projectileSpeed;
    if (line === 0) {
      continuousLowPressure += groupSpan;
      if (continuousLowPressure > maximumContinuousAirWindow) return false;
    } else {
      continuousLowPressure = 0;
    }
    const next = beats[index + 1];
    if (!next) continue;
    const nextLine = next.mobileLine ?? next.line;
    if (line !== nextLine && beat.intervalAfter < minimumLandingWindow) return false;
    if (line === 0 && nextLine === 0) {
      continuousLowPressure += beat.intervalAfter;
      if (continuousLowPressure > maximumContinuousAirWindow) {
        // A long enough interval is a valid landing-and-jump reset.
        if (beat.intervalAfter < minimumLandingWindow + minimumReactionTime) return false;
        continuousLowPressure = 0;
      }
    }
  }
  return true;
}

function buildMobileBossFallback(): BossPattern {
  const blocks = [
    MOBILE_BOSS_BLOCK_LIBRARY[0],
    MOBILE_BOSS_BLOCK_LIBRARY[1],
    MOBILE_BOSS_BLOCK_LIBRARY[2],
    MOBILE_BOSS_BLOCK_LIBRARY[3],
  ];
  return {
    id: "mobile-safe-fallback",
    difficulty: "hard",
    blockTypes: blocks.map((block) => block.type),
    beats: blocks.flatMap((block) => block.beats.map((beat, index) => ({
      ...beat,
      intervalAfter: beat.intervalAfter +
        (index === block.beats.length - 1 ? block.pauseOptions[1] : 0),
    }))),
  };
}
