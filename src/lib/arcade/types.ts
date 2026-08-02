export type ArcadeLeaderboardEntry = {
  id: string;
  playerId?: string | null;
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
  fieldError?: string;
};

export type ArcadeRunProofResult = {
  ok: boolean;
  proof?: string;
  message?: string;
};

export type ArcadeNicknameClaimResult = {
  ok: boolean;
  status: "assigned" | "nickname_taken" | "invalid" | "unavailable";
  message?: string;
};
