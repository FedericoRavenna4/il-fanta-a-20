export const BOSS_CONFIG = {
  warningSeconds: 2,
  durationSeconds: 15,
  initialWindowSeconds: { minimum: 95, maximum: 140 },
  cooldownSeconds: 190,
  itemIntervalSeconds: { minimum: 0.72, maximum: 1.25 },
  rewardRating: 3,
  warningAsset: "/game/eventi/boss-20-warning.png",
  bannerAsset: "/game/eventi/boss-20-banner.png",
  bossAsset: "/game/eventi/boss-20.png",
} as const;

export const RAFFICA_PRESENTATION_ASSETS = {
  malus: "/game/eventi/raffica-di-malus.png",
  bonus: "/game/eventi/raffica-di-bonus.png",
} as const;
