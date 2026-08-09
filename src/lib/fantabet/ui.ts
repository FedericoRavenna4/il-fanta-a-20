import type { FantaBetChoice, FantaBetType } from "./types";

export type PublishedRound = { id: number; status: string; opens_at: string; deadline_at: string };

export function selectRelevantRound<T extends PublishedRound>(rounds: T[], now: Date): T | null {
  const time = now.getTime();
  const open = rounds
    .filter((round) => round.status === "pubblicata" && new Date(round.opens_at).getTime() <= time && time < new Date(round.deadline_at).getTime())
    .sort((a, b) => new Date(b.deadline_at).getTime() - new Date(a.deadline_at).getTime())[0];
  return open ?? [...rounds]
    .filter((round) => ["pubblicata", "chiusa", "valutata"].includes(round.status))
    .sort((a, b) => new Date(b.deadline_at).getTime() - new Date(a.deadline_at).getTime())[0] ?? null;
}

export function isCompletePrediction(type: FantaBetType, prediction?: { scelta: string; exact_home: number | null; exact_away: number | null } | null) {
  if (!prediction) return false;
  if (type === "RISULTATO_ESATTO") return prediction.scelta === "ESATTO" && prediction.exact_home !== null && prediction.exact_away !== null;
  if (type === "UNDER_OVER_2_5") return prediction.scelta === "UNDER" || prediction.scelta === "OVER";
  return prediction.scelta === "1" || prediction.scelta === "X" || prediction.scelta === "2";
}

export function predictionOptions(type: FantaBetType): Array<{ value: FantaBetChoice; label: string }> {
  if (type === "UNDER_OVER_2_5") return [{ value: "UNDER", label: "UNDER 2.5" }, { value: "OVER", label: "OVER 2.5" }];
  if (type === "RISULTATO_ESATTO") return [];
  return ["1", "X", "2"].map((value) => ({ value: value as FantaBetChoice, label: value }));
}

export function searchLeaderboard<T extends { username: string }>(rows: T[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("it-IT");
  return normalized ? rows.filter((row) => row.username.toLocaleLowerCase("it-IT").includes(normalized)) : rows;
}

export function compactLeaderboard<T>(rows: T[], limit = 15) { return rows.slice(0, limit); }

export function isDemoMode(nodeEnv: string | undefined, requested: string | undefined) {
  return nodeEnv !== "production" && requested === "1";
}

export function clampExactScore(value: number) {
  return Math.min(20, Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0)));
}

export function currentStreakPresentation(streak: number) {
  const safe = Math.max(0, Math.trunc(Number.isFinite(streak) ? streak : 0));
  const progress = safe > 0 && safe % 5 === 0 ? 5 : safe % 5;
  if (progress === 0) return { progress, message: "Inizia la tua streak!" };
  if (progress === 5) return { progress, message: "Bonus costanza raggiunto!" };
  const remaining = 5 - progress;
  return { progress, message: remaining === 1 ? "Ancora 1 schedina per +10 PT!" : `Completa altre ${remaining} schedine per il tuo bonus!` };
}

export function canConfirmSlip(completed: number, required: number, writable: boolean) {
  return writable && required > 0 && completed === required;
}

export function canConfirmSubmittedSlip(completed: number, confirmed: number, required: number, writable: boolean) {
  return canConfirmSlip(completed, required, writable) && confirmed === required;
}

export function isSubmitButtonDisabled(input: { hydrated: boolean; completed: number; confirmed: number; required: number; writable: boolean; pending: boolean }) {
  if (!input.hydrated) return true;
  return Boolean(!canConfirmSubmittedSlip(input.completed, input.confirmed, input.required, input.writable) || input.pending);
}

export function countdownParts(deadline: string, snapshotNow: number) {
  const value = Math.max(0, new Date(deadline).getTime() - snapshotNow);
  return [
    ["GIORNI", Math.floor(value / 86_400_000)],
    ["ORE", Math.floor(value % 86_400_000 / 3_600_000)],
    ["MINUTI", Math.floor(value % 3_600_000 / 60_000)],
    ["SECONDI", Math.floor(value % 60_000 / 1000)],
  ] as const;
}

export type RecentMatch = { matchday: number; homeId: number; awayId: number; homeGoals: number; awayGoals: number; homeFantasy: number | null; awayFantasy: number | null };

export function recentTeamStats(matches: RecentMatch[], teamId: number, limit = 5) {
  const recent = matches.filter((match) => match.homeId === teamId || match.awayId === teamId).sort((a, b) => b.matchday - a.matchday).slice(0, limit);
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const fantasy: number[] = [];
  for (const match of recent) {
    const home = match.homeId === teamId;
    const scored = home ? match.homeGoals : match.awayGoals;
    const conceded = home ? match.awayGoals : match.homeGoals;
    goalsFor += scored; goalsAgainst += conceded;
    if (scored > conceded) wins++; else if (scored === conceded) draws++; else losses++;
    const score = home ? match.homeFantasy : match.awayFantasy;
    if (score !== null) fantasy.push(score);
  }
  const form = recent.map((match) => {
    const home = match.homeId === teamId;
    const scored = home ? match.homeGoals : match.awayGoals;
    const conceded = home ? match.awayGoals : match.homeGoals;
    return scored > conceded ? "V" : scored === conceded ? "P" : "S";
  });
  const details = recent.map((match) => ({
    matchday: match.matchday,
    opponentId: match.homeId === teamId ? match.awayId : match.homeId,
    home: match.homeId === teamId,
    goalsFor: match.homeId === teamId ? match.homeGoals : match.awayGoals,
    goalsAgainst: match.homeId === teamId ? match.awayGoals : match.homeGoals,
    fantasyPoints: match.homeId === teamId ? match.homeFantasy : match.awayFantasy,
  }));
  return { played: recent.length, wins, draws, losses, goalsFor, goalsAgainst, fantasyPointsTotal: fantasy.length ? Number(fantasy.reduce((sum, value) => sum + value, 0).toFixed(2)) : null, averageFantasy: fantasy.length ? Number((fantasy.reduce((sum, value) => sum + value, 0) / fantasy.length).toFixed(2)) : null, form, details };
}

export function currentTeamStanding(matches: RecentMatch[], teamId: number) {
  const rows = new Map<number, { id: number; points: number; goalsFor: number; goalsAgainst: number; fantasy: number }>();
  for (const match of matches) {
    for (const id of [match.homeId, match.awayId]) if (!rows.has(id)) rows.set(id, { id, points: 0, goalsFor: 0, goalsAgainst: 0, fantasy: 0 });
    const home = rows.get(match.homeId)!; const away = rows.get(match.awayId)!;
    home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals; away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals;
    home.fantasy += match.homeFantasy ?? 0; away.fantasy += match.awayFantasy ?? 0;
    if (match.homeGoals > match.awayGoals) home.points += 3; else if (match.homeGoals < match.awayGoals) away.points += 3; else { home.points++; away.points++; }
  }
  const ordered = [...rows.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || b.fantasy - a.fantasy || a.id - b.id);
  const index = ordered.findIndex((row) => row.id === teamId);
  return index === -1 ? { position: null, points: null, goalsFor: 0, goalsAgainst: 0, fantasyPointsTotal: null } : { position: index + 1, points: ordered[index].points, goalsFor: ordered[index].goalsFor, goalsAgainst: ordered[index].goalsAgainst, fantasyPointsTotal: Number(ordered[index].fantasy.toFixed(2)) };
}

export type LeaderboardFilter = "global" | "community" | "official";
export function filterLeaderboard<T extends { societa_id: number | null }>(rows: T[], filter: LeaderboardFilter) {
  if (filter === "community") return rows.filter((row) => row.societa_id === null);
  if (filter === "official") return rows.filter((row) => row.societa_id !== null);
  return rows;
}

export function confirmRoundBetId(current: ReadonlySet<number>, betId: number, roundBetIds: ReadonlySet<number>, required: number) {
  if (!roundBetIds.has(betId) || current.has(betId) || current.size >= required) return new Set(current);
  return new Set(current).add(betId);
}

export function consistencyBlockProgress(streak: number, blockSize = 5) {
  if (blockSize <= 0) return 0;
  const safeStreak = Math.max(0, Math.trunc(streak));
  return safeStreak > 0 && safeStreak % blockSize === 0 ? blockSize : safeStreak % blockSize;
}

export function currentTeamPosition(matches: RecentMatch[], teamId: number) { return currentTeamStanding(matches, teamId).position; }
