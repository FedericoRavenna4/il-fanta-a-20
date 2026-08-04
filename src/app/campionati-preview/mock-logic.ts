import type { LeagueMock, MockMatch, ScoreHighlight, StandingRow } from "./types";

function tableAt(league: LeagueMock, matchday: number): Omit<StandingRow, "position" | "movement">[] {
  const rows = new Map(league.teams.map((team) => [team.id, {
    ...team, played: 0, won: 0, drawn: 0, lost: 0, points: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, fantasyPoints: 0,
  }]));
  for (let day = 1; day <= Math.min(matchday, league.currentMatchday); day += 1) {
    for (const match of league.matchdays[day]) {
      if (match.homeGoals === null || match.awayGoals === null) continue;
      const home = rows.get(match.home.id)!;
      const away = rows.get(match.away.id)!;
      home.played += 1; away.played += 1;
      home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals;
      away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals;
      home.fantasyPoints += match.homeScore ?? 0; away.fantasyPoints += match.awayScore ?? 0;
      if (match.homeGoals > match.awayGoals) { home.won += 1; away.lost += 1; home.points += 3; }
      else if (match.homeGoals < match.awayGoals) { away.won += 1; home.lost += 1; away.points += 3; }
      else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
    }
  }
  return [...rows.values()].map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    fantasyPoints: Number(row.fantasyPoints.toFixed(1)),
  })).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.fantasyPoints - a.fantasyPoints || a.name.localeCompare(b.name));
}

export function standingsFor(league: LeagueMock): StandingRow[] {
  const current = tableAt(league, league.currentMatchday);
  const previous = tableAt(league, league.currentMatchday - 1);
  const oldPosition = new Map(previous.map((row, index) => [row.id, index + 1]));
  return current.map((row, index) => ({
    ...row,
    position: index + 1,
    movement: (oldPosition.get(row.id) ?? index + 1) - (index + 1),
  }));
}

export function leagueHighlights(league: LeagueMock): { best: ScoreHighlight; worst: ScoreHighlight } {
  const scores: ScoreHighlight[] = [];
  for (let day = 1; day <= league.currentMatchday; day += 1) {
    league.matchdays[day].forEach((match) => {
      if (match.homeScore !== null) scores.push({ team: match.home, score: match.homeScore, matchday: day });
      if (match.awayScore !== null) scores.push({ team: match.away, score: match.awayScore, matchday: day });
    });
  }
  return {
    best: [...scores].sort((a, b) => b.score - a.score)[0],
    worst: [...scores].sort((a, b) => a.score - b.score)[0],
  };
}

export function globalDayStats(leagues: LeagueMock[], day: number) {
  const matches = leagues.flatMap((league) => league.matchdays[day] ?? []);
  const played = matches.filter((match) => match.homeGoals !== null && match.awayGoals !== null);
  const scoreEntries = played.flatMap((match) => [
    { team: match.home, score: match.homeScore!, matchday: day },
    { team: match.away, score: match.awayScore!, matchday: day },
  ]);
  const highestScoringMatch = [...played].sort((a, b) => {
    const goalsA = a.homeGoals! + a.awayGoals!;
    const goalsB = b.homeGoals! + b.awayGoals!;
    return goalsB - goalsA || (b.homeScore! + b.awayScore!) - (a.homeScore! + a.awayScore!);
  })[0] as MockMatch | undefined;
  return {
    best: [...scoreEntries].sort((a, b) => b.score - a.score)[0],
    worst: [...scoreEntries].sort((a, b) => a.score - b.score)[0],
    highestScoringMatch,
  };
}

