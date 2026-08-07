export type FantaBetProfileSummary = { profileId: string; globalPosition: number; points: number; correctPredictions: number; perfectSlips: number };
export type ArcadeProfileSummary = { profileId: string; legacyPlayerId: string; personalRecord: number; maximumLevel: number; leaderboardPosition: number | null };
export type UserEmblemsProfileSummary = { profileId: string; unlocked: number; featured: Array<{ id: string; name: string; imageUrl: string }>; favoriteIds: string[] };

export type AccountHubModules = {
  fantabet?: FantaBetProfileSummary | null;
  arcade?: ArcadeProfileSummary | null;
  emblems?: UserEmblemsProfileSummary | null;
};

export function isOfficialAccount(societaId: number | null) {
  return societaId !== null;
}

export function visibleAccountModuleKeys(modules: AccountHubModules) {
  return (["fantabet", "arcade", "emblems"] as const).filter((key) => modules[key] != null);
}
