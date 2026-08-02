export const BOSS_CONFIG = {
  warningSeconds: 1.7,
  durationSeconds: 20,
  cooldownSeconds: 4,
  distanceWindowMeters: { minimum: 450, maximum: 550 },
  itemIntervalSeconds: { minimum: 0.48, maximum: 0.88 },
  rewardRating: 3,
  warningAsset: "/game/eventi/boss-20-banner.png",
  bannerAsset: "/game/eventi/boss-20-banner.png",
  bossAsset: "/game/eventi/boss-20.png",
  mobile: {
    warningBonusSeconds: 0.7,
    initialAttackDelaySeconds: 0.62,
    durationSeconds: 17,
    projectileSpeedBase: 270,
    projectileSpeedDifficultyBonus: 38,
    maximumActiveProjectiles: 5,
    volleyLimits: {
      yellowCard: 3,
      redCard: 3,
      concededGoal: 2,
      ownGoal: 1,
      missedPenalty: 1,
    },
    minimumAttackIntervalSeconds: 0.9,
    attackIntervalMultiplier: 1.14,
    patternTransitionPauseSeconds: 0.42,
    recoveryBonusSeconds: 0.62,
    projectileHitboxScale: 0.8,
    verticalOffset: -68,
  },
} as const;

export const RAFFICA_PRESENTATION_ASSETS = {
  malus: "/game/eventi/raffica-di-malus.png",
  bonus: "/game/eventi/raffica-di-bonus.png",
} as const;
