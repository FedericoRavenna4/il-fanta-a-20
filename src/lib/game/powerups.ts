import type { PowerUpKind } from "./types";
import type { GameAssetKey } from "./assets";
import { POWER_UP_COPY } from "./content";

export type PowerUpDefinition = {
  kind: PowerUpKind;
  name: string;
  effect: string;
  asset: `/game/powerups/${string}.png`;
  banner: `/game/powerups/${string}-banner.png`;
  assetKey: GameAssetKey;
  bannerAssetKey: GameAssetKey;
  durationSeconds: number;
  weight: number;
  width: number;
  height: number;
  hitbox: { x: number; y: number; width: number; height: number };
  hudColor: string;
  activation: "shield" | "scale" | "slowdown" | "magnet" | "repel";
  deactivation: "expire" | "restore-scale" | "restore-speed" | "release-force";
};

export const POWER_UP_CONFIG: Record<PowerUpKind, PowerUpDefinition> = {
  luperto: {
    kind: "luperto", name: "Luperto", effect: POWER_UP_COPY.luperto.description,
    asset: "/game/powerups/luperto.png", banner: "/game/powerups/luperto-banner.png", assetKey: "powerup.luperto", bannerAssetKey: "powerup.lupertoBanner",
    durationSeconds: 15, weight: 15, width: 88, height: 132,
    hitbox: { x: 11, y: 13, width: 66, height: 106 }, hudColor: "#7dd3fc",
    activation: "shield", deactivation: "expire",
  },
  lukaku: {
    kind: "lukaku", name: "Lukaku", effect: POWER_UP_COPY.lukaku.description,
    asset: "/game/powerups/lukaku.png", banner: "/game/powerups/lukaku-banner.png", assetKey: "powerup.lukaku", bannerAssetKey: "powerup.lukakuBanner",
    durationSeconds: 15, weight: 12, width: 94, height: 141,
    hitbox: { x: 12, y: 14, width: 70, height: 113 }, hudColor: "#fbbf24",
    activation: "scale", deactivation: "restore-scale",
  },
  dybala: {
    kind: "dybala", name: "Dybala", effect: POWER_UP_COPY.dybala.description,
    asset: "/game/powerups/dybala.png", banner: "/game/powerups/dybala-banner.png", assetKey: "powerup.dybala", bannerAssetKey: "powerup.dybalaBanner",
    durationSeconds: 15, weight: 12, width: 88, height: 132,
    hitbox: { x: 11, y: 13, width: 66, height: 106 }, hudColor: "#c4b5fd",
    activation: "slowdown", deactivation: "restore-speed",
  },
  "nico-paz": {
    kind: "nico-paz", name: "Nico Paz", effect: POWER_UP_COPY["nico-paz"].description,
    asset: "/game/powerups/nico-paz.png", banner: "/game/powerups/nico-paz-banner.png", assetKey: "powerup.nicoPaz", bannerAssetKey: "powerup.nicoPazBanner",
    durationSeconds: 15, weight: 10, width: 91, height: 137,
    hitbox: { x: 11, y: 14, width: 69, height: 109 }, hudColor: "#67e8f9",
    activation: "magnet", deactivation: "release-force",
  },
  gimenez: {
    kind: "gimenez", name: "Gimenez", effect: POWER_UP_COPY.gimenez.description,
    asset: "/game/powerups/gimenez.png", banner: "/game/powerups/gimenez-banner.png", assetKey: "powerup.gimenez", bannerAssetKey: "powerup.gimenezBanner",
    durationSeconds: 15, weight: 8, width: 88, height: 132,
    hitbox: { x: 11, y: 13, width: 66, height: 106 }, hudColor: "#fb7185",
    activation: "repel", deactivation: "release-force",
  },
};

export const POWER_UP_SPAWN_CONFIG = {
  minimumStartSeconds: 6,
  chancePerSpawnOpportunity: 0.14,
  openingChancePerSpawnOpportunity: 0.27,
  cooldownSeconds: 25,
  maximumOnField: 1,
  guaranteedDistanceStart: 35,
  guaranteedDistanceLimit: 40,
} as const;

export function pickPowerUp(random = Math.random): PowerUpDefinition {
  const definitions = Object.values(POWER_UP_CONFIG);
  let cursor = random() * definitions.reduce((sum, item) => sum + item.weight, 0);
  for (const definition of definitions) {
    cursor -= definition.weight;
    if (cursor <= 0) return definition;
  }
  return definitions[definitions.length - 1];
}
