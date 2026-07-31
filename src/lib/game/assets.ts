import type { EventKind, PhysicalObstacleKind } from "./types";

export type GameBackgroundStage = 1 | 2 | 3;

export type SourceCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpriteConfig = {
  asset: GameAssetKey;
  source: SourceCrop;
  width: number;
  height: number;
  hitbox: { x: number; y: number; width: number; height: number };
};

export const GAME_ASSETS = {
  backgrounds: {
    stage1Stadium: "/game/backgrounds/sfondo-1-stadio0.png",
    stage1Ground: "/game/backgrounds/sfondo-1-terreno0.png",
    stage2Stadium: "/game/backgrounds/sfondo-2-stadio0.png",
    stage2Ground: "/game/backgrounds/sfondo-2-terreno0.png",
    stage3Stadium: "/game/backgrounds/sfondo-3-stadio0.png",
    stage3Ground: "/game/backgrounds/sfondo-3-terreno0.png",
  },
  bonus: {
    assist: "/game/bonus/assist.png",
    cleanSheet: "/game/bonus/clean-sheet.png",
    goal: "/game/bonus/gol-fatto.png",
    hatTrick: "/game/bonus/tripletta.png",
  },
  hazards: {
    stage1: "/game/hazards/buca-1.png",
    stage2: "/game/hazards/buca-2.png",
    stage3: "/game/hazards/buca-3.png",
  },
  malus: {
    yellowCard: "/game/malus/ammonizione.png",
    ownGoal: "/game/malus/autogol.png",
    redCard: "/game/malus/espulsione.png",
    concededGoal: "/game/malus/gol-subito.png",
    missedPenalty: "/game/malus/rigore-sbagliato.png",
  },
  obstacles: {
    cornerFlag: "/game/obstacles/bandierina.png",
    stretcher: "/game/obstacles/barella.png",
    slidingTackle: "/game/obstacles/scivolata.png",
    var: "/game/obstacles/var.png",
  },
  powerups: {
    luperto: "/game/powerups/luperto.png",
    lupertoBanner: "/game/powerups/luperto-banner.png",
    lukaku: "/game/powerups/lukaku.png",
    lukakuBanner: "/game/powerups/lukaku-banner.png",
    dybala: "/game/powerups/dybala.png",
    dybalaBanner: "/game/powerups/dybala-banner.png",
    nicoPaz: "/game/powerups/nico-paz.png",
    nicoPazBanner: "/game/powerups/nico-paz-banner.png",
    gimenez: "/game/powerups/gimenez.png",
    gimenezBanner: "/game/powerups/gimenez-banner.png",
  },
  events: {
    boss: "/game/eventi/boss-20.png",
    bossBanner: "/game/eventi/boss-20-banner.png",
    bonusBurst: "/game/eventi/raffica-di-bonus.png",
    malusBurst: "/game/eventi/raffica-di-malus.png",
  },
} as const;

type FlattenAssetPaths<T> = T extends string
  ? T
  : T extends Record<string, infer Value>
    ? FlattenAssetPaths<Value>
    : never;

export type GameAssetPath = FlattenAssetPaths<typeof GAME_ASSETS>;
export type GameAssetKey =
  | `background.${keyof typeof GAME_ASSETS.backgrounds}`
  | `bonus.${keyof typeof GAME_ASSETS.bonus}`
  | `hazard.${keyof typeof GAME_ASSETS.hazards}`
  | `malus.${keyof typeof GAME_ASSETS.malus}`
  | `obstacle.${keyof typeof GAME_ASSETS.obstacles}`
  | `powerup.${keyof typeof GAME_ASSETS.powerups}`
  | `event.${keyof typeof GAME_ASSETS.events}`;

export const BACKGROUND_STAGE_CONFIG: Record<
  GameBackgroundStage,
  {
    minimumRating: number;
    maximumRating: number | null;
    stadium: GameAssetKey;
    ground: GameAssetKey;
    hazard: GameAssetKey;
    backdrop: string;
  }
> = {
  1: {
    minimumRating: 62,
    maximumRating: 73.5,
    stadium: "background.stage1Stadium",
    ground: "background.stage1Ground",
    hazard: "hazard.stage1",
    backdrop: "#1688e8",
  },
  2: {
    minimumRating: 74,
    maximumRating: 85.5,
    stadium: "background.stage2Stadium",
    ground: "background.stage2Ground",
    hazard: "hazard.stage2",
    backdrop: "#16365b",
  },
  3: {
    minimumRating: 86,
    maximumRating: null,
    stadium: "background.stage3Stadium",
    ground: "background.stage3Ground",
    hazard: "hazard.stage3",
    backdrop: "#06142f",
  },
};

export const BACKGROUND_TRANSITION_CONFIG = {
  fadeDurationSeconds: 2,
  groundSpeedFactor: 1,
  stadiumSpeedFactor: 0.96,
  maximumGroundSpeed: 760,
  maximumStadiumSpeed: 720,
  visualComfortStartSpeed: 410,
  loopPixelOverlap: 1,
  groundLoopOverlap: 220,
  groundLoopBlendSteps: 48,
} as const;

export const BONUS_WEIGHTS: Partial<Record<EventKind, number>> = {
  assist: 15,
  cleanSheet: 15,
  goal: 4,
  hatTrick: 1,
  savedPenalty: 0,
};

export const MALUS_WEIGHTS: Partial<Record<EventKind, number>> = {
  yellowCard: 14,
  concededGoal: 14,
  redCard: 7,
  ownGoal: 7,
  missedPenalty: 3,
};

export const EVENT_SPRITES: Partial<Record<EventKind, SpriteConfig>> = {
  assist: sprite("bonus.assist", [0, 0, 720, 720], 51, 38, [9, 10, 33, 24]),
  cleanSheet: sprite("bonus.cleanSheet", [0, 0, 720, 720], 39, 49, [8, 12, 25, 33]),
  goal: sprite("bonus.goal", [0, 0, 720, 720], 58, 50, [11, 13, 37, 32]),
  hatTrick: sprite("bonus.hatTrick", [0, 0, 1080, 720], 64, 52, [12, 14, 42, 32]),
  yellowCard: sprite("malus.yellowCard", [0, 0, 720, 720], 37, 43, [9, 11, 21, 28]),
  concededGoal: sprite("malus.concededGoal", [0, 0, 720, 720], 54, 49, [10, 13, 35, 31]),
  redCard: sprite("malus.redCard", [0, 0, 720, 720], 37, 43, [9, 11, 21, 28]),
  ownGoal: sprite("malus.ownGoal", [0, 0, 720, 720], 54, 50, [10, 13, 35, 32]),
  missedPenalty: sprite("malus.missedPenalty", [0, 0, 1080, 720], 69, 43, [13, 12, 44, 26]),
};

export const OBSTACLE_SPRITES: Record<PhysicalObstacleKind, SpriteConfig> = {
  cornerFlag: sprite("obstacle.cornerFlag", [226, 20, 355, 667], 110, 205, [27, 8, 58, 192]),
  stretcher: sprite("obstacle.stretcher", [0, 0, 1080, 720], 225, 100, [27, 45, 171, 50]),
  slidingTackle: sprite("obstacle.slidingTackle", [0, 0, 1080, 720], 160, 82, [24, 36, 116, 43]),
  var: sprite("obstacle.var", [214, 22, 357, 696], 105, 205, [7, 7, 91, 194]),
};

export const PRIORITY_GAME_ASSET_KEYS: GameAssetKey[] = [
  "background.stage1Stadium",
  "background.stage1Ground",
  "hazard.stage1",
  "obstacle.cornerFlag",
  "obstacle.stretcher",
  "obstacle.slidingTackle",
  "obstacle.var",
];

export const GAME_ASSET_ENTRIES: ReadonlyArray<readonly [GameAssetKey, GameAssetPath]> = [
  ...entries("background", GAME_ASSETS.backgrounds),
  ...entries("bonus", GAME_ASSETS.bonus),
  ...entries("hazard", GAME_ASSETS.hazards),
  ...entries("malus", GAME_ASSETS.malus),
  ...entries("obstacle", GAME_ASSETS.obstacles),
  ["powerup.luperto", GAME_ASSETS.powerups.luperto],
  ["powerup.lukaku", GAME_ASSETS.powerups.lukaku],
  ["powerup.dybala", GAME_ASSETS.powerups.dybala],
  ["powerup.nicoPaz", GAME_ASSETS.powerups.nicoPaz],
  ["powerup.gimenez", GAME_ASSETS.powerups.gimenez],
  ["event.boss", GAME_ASSETS.events.boss],
];

export function getBackgroundStageForDistance(
  distance: number,
  segmentMeters: number
): GameBackgroundStage {
  return ((Math.floor(Math.max(0, distance) / segmentMeters) % 3) + 1) as GameBackgroundStage;
}

function sprite(
  asset: GameAssetKey,
  source: [number, number, number, number],
  width: number,
  height: number,
  hitbox: [number, number, number, number]
): SpriteConfig {
  return {
    asset,
    source: { x: source[0], y: source[1], width: source[2], height: source[3] },
    width,
    height,
    hitbox: { x: hitbox[0], y: hitbox[1], width: hitbox[2], height: hitbox[3] },
  };
}

function entries<Prefix extends "background" | "bonus" | "hazard" | "malus" | "obstacle" | "powerup" | "event", Values extends Record<string, GameAssetPath>>(
  prefix: Prefix,
  values: Values
) {
  return Object.entries(values).map(([key, value]) => [
    `${prefix}.${key}` as GameAssetKey,
    value,
  ] as const);
}
