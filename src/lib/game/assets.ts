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
    bossWarning: "/game/eventi/boss-20-warning.png",
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
  assist: sprite("bonus.assist", [203, 270, 640, 460], 43, 32, [5, 4, 33, 24]),
  cleanSheet: sprite("bonus.cleanSheet", [289, 188, 475, 592], 33, 41, [4, 4, 25, 33]),
  goal: sprite("bonus.goal", [235, 220, 618, 540], 49, 42, [6, 5, 37, 32]),
  hatTrick: sprite("bonus.hatTrick", [491, 221, 678, 550], 54, 44, [6, 6, 42, 32]),
  yellowCard: sprite("malus.yellowCard", [303, 229, 443, 510], 31, 36, [5, 4, 21, 28]),
  concededGoal: sprite("malus.concededGoal", [235, 220, 609, 540], 45, 41, [5, 5, 35, 31]),
  redCard: sprite("malus.redCard", [306, 229, 440, 508], 31, 36, [5, 4, 21, 28]),
  ownGoal: sprite("malus.ownGoal", [236, 234, 583, 545], 45, 42, [5, 5, 35, 32]),
  missedPenalty: sprite("malus.missedPenalty", [101, 227, 849, 518], 58, 36, [7, 5, 44, 26]),
};

export const OBSTACLE_SPRITES: Record<PhysicalObstacleKind, SpriteConfig> = {
  cornerFlag: sprite("obstacle.cornerFlag", [608, 144, 342, 680], 48, 96, [11, 5, 30, 87]),
  stretcher: sprite("obstacle.stretcher", [120, 252, 1316, 582], 174, 77, [11, 28, 152, 44]),
  slidingTackle: sprite("obstacle.slidingTackle", [407, 378, 914, 468], 130, 67, [12, 24, 110, 40]),
  var: sprite("obstacle.var", [644, 80, 383, 816], 54, 116, [10, 9, 35, 103]),
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
