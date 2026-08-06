import type { GlobalStats, LeagueId, LeagueRules, LeagueStats, Match, StandingRow, Team } from "./types";

const calculated = (match: Match) => match.status === "calcolata" && match.homeGoals !== null && match.awayGoals !== null;

/** Derives navigation solely from imported fixtures; works for leagues, cups and short formats. */
export function deriveAvailableMatchdays(matches: Array<Pick<Match, "matchday">>): number[] {
  return [...new Set(matches.map((match) => match.matchday))].sort((a, b) => a - b);
}

export function calculateStandings(teams: Team[], matches: Match[], throughMatchday = Number.POSITIVE_INFINITY): StandingRow[] {
  const rows = new Map(teams.map((team) => [team.id, { ...team, played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, fantasyPoints: 0 }]));
  for (const match of matches) {
    if (match.matchday > throughMatchday || !calculated(match)) continue;
    const home = rows.get(match.home.id); const away = rows.get(match.away.id);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.goalsFor += match.homeGoals!; home.goalsAgainst += match.awayGoals!;
    away.goalsFor += match.awayGoals!; away.goalsAgainst += match.homeGoals!;
    home.fantasyPoints += match.homeScore ?? 0; away.fantasyPoints += match.awayScore ?? 0;
    if (match.homeGoals! > match.awayGoals!) { home.won++; away.lost++; home.points += 3; }
    else if (match.homeGoals! < match.awayGoals!) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return [...rows.values()].map((row) => ({ ...row, position: 0, movement: 0, goalDifference: row.goalsFor - row.goalsAgainst, fantasyPoints: Number(row.fantasyPoints.toFixed(2)) }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || b.fantasyPoints - a.fantasyPoints || a.name.localeCompare(b.name, "it"))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export function calculatePositionChanges(current: StandingRow[], previous: StandingRow[], matchday: number): StandingRow[] {
  if (matchday <= 1) return current.map((row) => ({ ...row, movement: 0 }));
  const oldPositions = new Map(previous.map((row) => [row.id, row.position]));
  return current.map((row) => ({ ...row, movement: (oldPositions.get(row.id) ?? row.position) - row.position }));
}

export function standingsAt(teams: Team[], matches: Match[], matchday: number) {
  return calculatePositionChanges(calculateStandings(teams, matches, matchday), calculateStandings(teams, matches, matchday - 1), matchday);
}

export function calculateLeagueMatchdayStats(matches: Match[], matchday: number): LeagueStats {
  const scores = matches.filter((m) => m.matchday === matchday && calculated(m)).flatMap((m) => [
    ...(m.homeScore === null ? [] : [{ team: m.home, score: m.homeScore, matchday }]),
    ...(m.awayScore === null ? [] : [{ team: m.away, score: m.awayScore, matchday }]),
  ]);
  return { best: [...scores].sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name, "it"))[0] ?? null, worst: [...scores].sort((a, b) => a.score - b.score || a.team.name.localeCompare(b.team.name, "it"))[0] ?? null };
}

export function calculateGlobalMatchdayStats(matches: Match[], matchday: number): GlobalStats {
  const played = matches.filter((m) => m.matchday === matchday && calculated(m));
  const scores = played.flatMap((m) => [
    ...(m.homeScore === null ? [] : [{ team: m.home, score: m.homeScore, matchday }]),
    ...(m.awayScore === null ? [] : [{ team: m.away, score: m.awayScore, matchday }]),
  ]);
  const highestScoringMatch = [...played].sort((a, b) => (b.homeGoals! + b.awayGoals!) - (a.homeGoals! + a.awayGoals!) || ((b.homeScore ?? 0) + (b.awayScore ?? 0)) - ((a.homeScore ?? 0) + (a.awayScore ?? 0)) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
  return { best: [...scores].sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name, "it"))[0] ?? null, worst: [...scores].sort((a, b) => a.score - b.score || a.team.name.localeCompare(b.team.name, "it"))[0] ?? null, highestScoringMatch };
}

export function getLeagueRules(league: LeagueId, position: number, teamCount = 20): LeagueRules {
  return { promoted: league === "serie-b" ? position <= 3 : league.startsWith("serie-c") ? position === 1 : false, relegated: league === "serie-a" ? position > teamCount - 3 : league === "serie-b" ? position > teamCount - 4 : false, scattoPromozione: league.startsWith("serie-c") && position <= 5 };
}
