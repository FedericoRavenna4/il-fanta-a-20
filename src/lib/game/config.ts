import type { EventDefinition, EventKind, GameScenario } from "./types";

export const GAME_WIDTH = 900;
export const GAME_HEIGHT = 500;
export const GROUND_Y = 414;
export const PLAYER_SIZE = 68;
export const PLAYER_X = 132;
export const GRAVITY = 1850;
export const JUMP_FORCE = -735;

export const TEAM_RATING_INITIAL = 62;
export const TEAM_RATING_THRESHOLD = 62;
export const INITIAL_PROTECTION_SECONDS = 5;
export const CROUCH_DURATION_MS = 620;
export const GOAL_RATING_STEP = 4;
export const GOAL_THRESHOLD_SCORE_BONUS = 400;
export const GOAL_THRESHOLD_COMBO_BONUS = 0.25;
export const FLOW_PROGRESS_PER_SECOND = 1.55;
export const FLOW_PERFECT_OBSTACLE = 17;
export const FLOW_NEW_SCENARIO = 18;
export const FLOW_RATING_REWARD = 0.5;

export const SPEED_CONFIG = {
  initial: 292,
  maximum: 780,
} as const;

export const DIFFICULTY_CONFIG = {
  rampSeconds: 270,
  targetDistance: 3300,
  targetScore: 18000,
  scenarioStepsToMaximum: 11,
  weights: {
    duration: 0.38,
    distance: 0.28,
    score: 0.17,
    competition: 0.17,
  },
  speedCurvePower: 1.12,
  movingMalusBaseChance: 0.1,
  movingMalusMaximumChance: 0.42,
  bonusTrailBaseChance: 0.08,
  bonusTrailMaximumChance: 0.28,
  tacticalBonusChance: 0.34,
} as const;

export const SPAWN_CONFIG = {
  initialInterval: 1.55,
  minimumInterval: 0.56,
  randomInterval: 0.42,
  minimumClearDistance: 110,
  speedDistanceFactor: 0.76,
  pitBaseChance: 0.035,
  pitMaximumChance: 0.13,
  physicalBaseChance: 0.31,
  physicalMaximumChance: 0.45,
  malusBaseChance: 0.29,
  malusMaximumChance: 0.34,
  sequenceBaseChance: 0.06,
  sequenceMaximumChance: 0.36,
} as const;

export const SCENARIO_DURATION_SECONDS = 22;
export const SCENARIO_TRANSITION_SECONDS = 2;

export const EVENT_DEFINITIONS: Record<EventKind, EventDefinition> = {
  yellowCard: {
    kind: "yellowCard",
    category: "malus",
    label: "Ammonizione",
    shortLabel: "GIALLO",
    symbol: "!",
    ratingDelta: -0.5,
    arcadePoints: -100,
    weight: 14,
    color: "#facc15",
    border: "#a16207",
  },
  redCard: {
    kind: "redCard",
    category: "malus",
    label: "Espulsione",
    shortLabel: "ROSSO",
    symbol: "!",
    ratingDelta: -1,
    arcadePoints: -180,
    weight: 7,
    color: "#ef4444",
    border: "#991b1b",
  },
  missedPenalty: {
    kind: "missedPenalty",
    category: "malus",
    label: "Rigore sbagliato",
    shortLabel: "RIGORE",
    symbol: "×",
    ratingDelta: -3,
    arcadePoints: -320,
    weight: 3,
    color: "#f8fafc",
    border: "#ef4444",
  },
  concededGoal: {
    kind: "concededGoal",
    category: "malus",
    label: "Gol subito",
    shortLabel: "SUBITO",
    symbol: "−1",
    ratingDelta: -1,
    arcadePoints: -140,
    weight: 14,
    color: "#fb7185",
    border: "#be123c",
  },
  ownGoal: {
    kind: "ownGoal",
    category: "malus",
    label: "Autogol",
    shortLabel: "AUTOGOL",
    symbol: "−2",
    ratingDelta: -2,
    arcadePoints: -240,
    weight: 5,
    color: "#c084fc",
    border: "#7e22ce",
  },
  goal: {
    kind: "goal",
    category: "bonus",
    label: "Gol",
    shortLabel: "GOL",
    symbol: "+3",
    ratingDelta: 3,
    arcadePoints: 320,
    weight: 6,
    color: "#22c55e",
    border: "#15803d",
  },
  assist: {
    kind: "assist",
    category: "bonus",
    label: "Assist",
    shortLabel: "ASSIST",
    symbol: "+1",
    ratingDelta: 1,
    arcadePoints: 170,
    weight: 10,
    color: "#38bdf8",
    border: "#0369a1",
  },
  cleanSheet: {
    kind: "cleanSheet",
    category: "bonus",
    label: "Clean sheet",
    shortLabel: "CLEAN",
    symbol: "+1",
    ratingDelta: 1,
    arcadePoints: 210,
    weight: 8,
    color: "#fbbf24",
    border: "#b45309",
  },
  savedPenalty: {
    kind: "savedPenalty",
    category: "bonus",
    label: "Rigore parato",
    shortLabel: "PARATA",
    symbol: "+3",
    ratingDelta: 3,
    arcadePoints: 460,
    weight: 3,
    color: "#818cf8",
    border: "#4338ca",
  },
  hatTrick: {
    kind: "hatTrick",
    category: "bonus",
    label: "Tripletta",
    shortLabel: "TRIPLETTA",
    symbol: "+9",
    ratingDelta: 9,
    arcadePoints: 1100,
    weight: 1,
    color: "#f59e0b",
    border: "#92400e",
  },
};

export const BONUS_POOL = Object.values(EVENT_DEFINITIONS).filter(
  (event) => event.category === "bonus"
);
export const MALUS_POOL = Object.values(EVENT_DEFINITIONS).filter(
  (event) => event.category === "malus"
);

export const GAME_SCENARIOS: GameScenario[] = [
  { id: "serie-c", name: "Serie C", subtitle: "La corsa comincia dal basso", skyTop: "#17251f", skyBottom: "#55705c", ground: "#173d25", accent: "#d6b27a", secondary: "#76563c", grassLight: "#397a43", grassDark: "#285f34", stand: "#4b5563", crowd: "#94a3b8", wear: 0.72, lightIntensity: 0.35, decor: "terraces" },
  { id: "serie-b", name: "Serie B", subtitle: "Il salto verso l'élite", skyTop: "#10243a", skyBottom: "#61788a", ground: "#123e29", accent: "#dbeafe", secondary: "#64748b", grassLight: "#31834a", grassDark: "#21663a", stand: "#475569", crowd: "#cbd5e1", wear: 0.42, lightIntensity: 0.5, decor: "towers" },
  { id: "serie-a", name: "Serie A", subtitle: "Il palcoscenico più alto", skyTop: "#03152f", skyBottom: "#0757a5", ground: "#0b3e25", accent: "#7dd3fc", secondary: "#2563eb", grassLight: "#2f9a50", grassDark: "#217b40", stand: "#1e3a5f", crowd: "#dbeafe", wear: 0.16, lightIntensity: 0.78, decor: "stadium" },
  { id: "coppa", name: "Coppa Fanta a 20", subtitle: "Dentro o fuori", skyTop: "#170d2c", skyBottom: "#6b3295", ground: "#0d4628", accent: "#f5d77b", secondary: "#8b5cf6", grassLight: "#35a85b", grassDark: "#218146", stand: "#312e81", crowd: "#f5d0fe", wear: 0.08, lightIntensity: 0.9, decor: "cup" },
  { id: "europa", name: "Europa League", subtitle: "Le notti continentali", skyTop: "#180803", skyBottom: "#9a3412", ground: "#0b4529", accent: "#fdba74", secondary: "#f97316", grassLight: "#35a75a", grassDark: "#207d43", stand: "#431407", crowd: "#fed7aa", wear: 0.05, lightIntensity: 0.92, decor: "europa" },
  { id: "champions", name: "Champions", subtitle: "Dove nasce la leggenda", skyTop: "#010611", skyBottom: "#102d63", ground: "#073d28", accent: "#bfdbfe", secondary: "#1d4ed8", grassLight: "#36aa5d", grassDark: "#207f45", stand: "#111c44", crowd: "#dbeafe", wear: 0.02, lightIntensity: 1, decor: "champions" },
];
