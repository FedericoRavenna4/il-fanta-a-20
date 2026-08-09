import type {
  FantaBetChoice,
  FantaBetMatchResult,
  FantaBetPlay,
  FantaBetPrediction,
  FantaBetRoundScore,
  FantaBetType,
} from "./types";

export const FANTABET_ROUND_RULES = [
  { type: "1X2", pointsValue: 3, count: 2 },
  { type: "UNDER_OVER_2_5", pointsValue: 1, count: 1 },
  { type: "RISULTATO_ESATTO", pointsValue: 10, count: 1 },
  { type: "FANTAPUNTEGGIO_1X2", pointsValue: 2, count: 1 },
] as const;

export const FANTABET_MAX_BASE_POINTS = 19;
export const FANTABET_MAX_PERFECT_POINTS = 38;

const outcome1X2 = (home: number, away: number): "1" | "X" | "2" =>
  home > away ? "1" : home < away ? "2" : "X";

export function resolveGoals1X2(result: FantaBetMatchResult): "1" | "X" | "2" | null {
  if (result.status !== "calcolata" || result.homeGoals === null || result.awayGoals === null) return null;
  return outcome1X2(result.homeGoals, result.awayGoals);
}

export function resolveUnderOver(result: FantaBetMatchResult): "UNDER" | "OVER" | null {
  if (result.status !== "calcolata" || result.homeGoals === null || result.awayGoals === null) return null;
  return result.homeGoals + result.awayGoals <= 2 ? "UNDER" : "OVER";
}

export function resolveFantasyPoints1X2(result: FantaBetMatchResult): "1" | "X" | "2" | null {
  if (
    result.status !== "calcolata" ||
    result.homeFantasyPoints === null ||
    result.awayFantasyPoints === null
  ) return null;
  return outcome1X2(result.homeFantasyPoints, result.awayFantasyPoints);
}

export function isExactResultCorrect(prediction: FantaBetPrediction, result: FantaBetMatchResult): boolean | null {
  if (result.status !== "calcolata" || result.homeGoals === null || result.awayGoals === null) return null;
  if (prediction.exactHome === null || prediction.exactHome === undefined || prediction.exactAway === null || prediction.exactAway === undefined) return false;
  return prediction.exactHome === result.homeGoals && prediction.exactAway === result.awayGoals;
}

export function scorePlay(
  type: FantaBetType,
  pointsValue: number,
  prediction: FantaBetPrediction,
  result: FantaBetMatchResult,
): { evaluable: boolean; correct: boolean | null; points: number | null } {
  let correct: boolean | null;
  if (type === "RISULTATO_ESATTO") correct = isExactResultCorrect(prediction, result);
  else {
    const outcome: FantaBetChoice | null = type === "1X2"
      ? resolveGoals1X2(result)
      : type === "UNDER_OVER_2_5"
        ? resolveUnderOver(result)
        : resolveFantasyPoints1X2(result);
    correct = outcome === null ? null : prediction.choice === outcome;
  }
  return correct === null
    ? { evaluable: false, correct: null, points: null }
    : { evaluable: true, correct, points: correct ? pointsValue : 0 };
}

export function hasValidRoundConfiguration(plays: Array<Pick<FantaBetPlay, "matchId" | "type" | "pointsValue" | "displayOrder">>): boolean {
  if (plays.length !== 5 || new Set(plays.map((play) => String(play.matchId))).size !== 5) return false;
  if (plays.map((play) => play.displayOrder).sort((a, b) => a - b).join(",") !== "1,2,3,4,5") return false;
  return FANTABET_ROUND_RULES.every((rule) =>
    plays.filter((play) => play.type === rule.type && play.pointsValue === rule.pointsValue).length === rule.count
  );
}

export function scoreRound(plays: FantaBetPlay[]): FantaBetRoundScore {
  if (!hasValidRoundConfiguration(plays)) return { evaluable: false, basePoints: null, finalPoints: null, correctPredictions: null, perfect: false };
  const scores = plays.map((play) => scorePlay(play.type, play.pointsValue, play.prediction, play.result));
  if (scores.some((score) => !score.evaluable)) return { evaluable: false, basePoints: null, finalPoints: null, correctPredictions: null, perfect: false };
  const basePoints = scores.reduce((total, score) => total + (score.points ?? 0), 0);
  const correctPredictions = scores.filter((score) => score.correct).length;
  const perfect = correctPredictions === 5;
  return { evaluable: true, basePoints, finalPoints: perfect ? basePoints * 2 : basePoints, correctPredictions, perfect };
}

export function isPredictionWindowOpen(
  round: { status: string; opensAt: Date | string; deadlineAt: Date | string },
  serverNow: Date | string,
): boolean {
  const now = new Date(serverNow).getTime();
  return round.status === "pubblicata" && now >= new Date(round.opensAt).getTime() && now < new Date(round.deadlineAt).getTime();
}

export function wasRoundPlayableAfterRegistration(deadlineAt: Date | string, profileCreatedAt: Date | string) {
  return new Date(deadlineAt).getTime() > new Date(profileCreatedAt).getTime();
}

export type LeaderboardInput = {
  profileId: string;
  username: string;
  normalizedUsername: string;
  roundId: string | number;
  roundOrder: number;
  roundStatus?: string;
  expired?: boolean;
  submitted: boolean;
  predictionCount: number;
  requiredPredictions?: number;
  consistencyBlockSize?: number;
  consistencyBonusPoints?: number;
  score: FantaBetRoundScore;
};

export function calculateConsistencyBonus(rounds: Array<{ submitted: boolean; predictionCount: number; roundStatus?: string; requiredPredictions?: number; consistencyBlockSize?: number; consistencyBonusPoints?: number }>) {
  let currentStreak = 0;
  let bonusPoints = 0;
  for (const round of rounds) {
    if (round.roundStatus === "annullata") continue;
    const requiredPredictions = round.requiredPredictions ?? 5;
    if (round.submitted && round.predictionCount === requiredPredictions) {
      currentStreak += 1;
      const blockSize = round.consistencyBlockSize ?? 5;
      if (currentStreak % blockSize === 0) bonusPoints += round.consistencyBonusPoints ?? 10;
    } else currentStreak = 0;
  }
  return { bonusPoints, currentStreak };
}

export function calculateGlobalLeaderboard(entries: LeaderboardInput[]) {
  const byProfile = new Map<string, LeaderboardInput[]>();
  for (const entry of entries) {
    if (entry.roundStatus === "annullata") continue;
    byProfile.set(entry.profileId, [...(byProfile.get(entry.profileId) ?? []), entry]);
  }
  const totals = [...byProfile.values()].flatMap((profileEntries) => {
    const ordered = [...profileEntries].sort((a, b) => a.roundOrder - b.roundOrder || String(a.roundId).localeCompare(String(b.roundId)));
    const complete = (entry: LeaderboardInput) => entry.submitted && entry.predictionCount === (entry.requiredPredictions ?? 5);
    const expired = ordered.filter((entry) => entry.expired !== false);
    const scored = expired.filter((entry) => complete(entry) && entry.score.evaluable);
    if (scored.length === 0) return [];
    const consistency = calculateConsistencyBonus(expired);
    const first = ordered[0];
    const predictionPoints = scored.reduce((sum, entry) => sum + (entry.score.finalPoints ?? 0), 0);
    return [{
      profileId: first.profileId,
      username: first.username,
      normalizedUsername: first.normalizedUsername,
      predictionPoints,
      consistencyBonusPoints: consistency.bonusPoints,
      totalPoints: predictionPoints + consistency.bonusPoints,
      roundsPlayed: scored.length,
      correctPredictions: scored.reduce((sum, entry) => sum + (entry.score.correctPredictions ?? 0), 0),
      perfectSlips: scored.filter((entry) => entry.score.perfect).length,
      currentStreak: consistency.currentStreak,
    }];
  });
  return totals
    .sort((a, b) => b.totalPoints - a.totalPoints || b.perfectSlips - a.perfectSlips || b.correctPredictions - a.correctPredictions || a.normalizedUsername.localeCompare(b.normalizedUsername) || a.profileId.localeCompare(b.profileId))
    .map((row, index) => ({ ...row, position: index + 1 }));
}
