export type ArcadeLeaderboardEntry = {
  id: string;
  nomeGiocatore: string;
  societaId: number;
  livello: 1 | 2 | 3;
  metri: number;
  updatedAt: string;
};

export type ArcadeSaveResult = {
  ok: boolean;
  message: string;
  metriRecord?: number;
  position?: number;
  highlightedId?: string;
  leaderboard?: ArcadeLeaderboardEntry[];
  leaderboardHasMore?: boolean;
  fieldError?: string;
};

export type ArcadeLeaderboardPage = {
  entries: ArcadeLeaderboardEntry[];
  hasMore: boolean;
};

export type ArcadeRunProofResult = {
  ok: boolean;
  proof?: string;
};
