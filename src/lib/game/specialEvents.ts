export const BOSS_CONFIG = {
  warningSeconds: 1.7,
  durationSeconds: 20,
  distanceWindowMeters: { minimum: 450, maximum: 550 },
  itemIntervalSeconds: { minimum: 0.48, maximum: 0.88 },
  rewardRating: 3,
  warningAsset: "/game/eventi/boss-20-banner.png",
  bannerAsset: "/game/eventi/boss-20-banner.png",
  bossAsset: "/game/eventi/boss-20.png",
  mobile: {
    warningBonusSeconds: 0.7,
    initialAttackDelaySeconds: 0.62,
    projectileSpeedBase: 285,
    projectileSpeedDifficultyBonus: 45,
    maximumActiveProjectiles: 6,
    minimumAttackIntervalSeconds: 0.78,
    attackIntervalMultiplier: 1.08,
    recoveryBonusSeconds: 0.52,
    projectileHitboxScale: 0.84,
  },
} as const;

export const RAFFICA_PRESENTATION_ASSETS = {
  malus: "/game/eventi/raffica-di-malus.png",
  bonus: "/game/eventi/raffica-di-bonus.png",
} as const;
