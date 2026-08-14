export type CoppaTeam = { id: number; name: string; slug: string; logo: string };
export type CoppaMatch = { id: string; day: number; home: CoppaTeam; away: CoppaTeam; homeGoals: number | null; awayGoals: number | null; homeScore: number | null; awayScore: number | null; status: string };
export type CoppaStanding = CoppaTeam & { position: number; movement: number; points: number; totalPoints: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number };

function standingsForMatches(teams: CoppaTeam[], matches: CoppaMatch[], previousPositions?: Map<number, number>) {
  const totals = new Map(teams.map((team) => [team.id, { ...team, points: 0, totalPoints: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }]));
  for (const match of matches) {
    if (!isCalculatedCoppaMatch(match)) continue;
    const home = totals.get(match.home.id); const away = totals.get(match.away.id);
    if (!home || !away) continue;
    home.totalPoints += match.homeScore; away.totalPoints += match.awayScore;
    home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals;
    if (match.homeGoals > match.awayGoals) { home.won += 1; away.lost += 1; home.points += 3; }
    else if (match.homeGoals < match.awayGoals) { away.won += 1; home.lost += 1; away.points += 3; }
    else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
  }
  return [...totals.values()]
    .sort((a, b) => b.points - a.points || b.totalPoints - a.totalPoints || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name, "it"))
    .map((row, index): CoppaStanding => ({ ...row, totalPoints: Number(row.totalPoints.toFixed(2)), position: index + 1, movement: previousPositions ? (previousPositions.get(row.id) ?? index + 1) - (index + 1) : 0 }));
}

export function isCalculatedCoppaMatch(match: CoppaMatch): match is CoppaMatch & { homeGoals: number; awayGoals: number; homeScore: number; awayScore: number } {
  return match.status === "calcolata" && match.homeGoals !== null && match.awayGoals !== null && match.homeScore !== null && match.awayScore !== null;
}

export function coppaStandingsForRange(teams: CoppaTeam[], matches: CoppaMatch[], from: number, to: number) {
  const ranged = matches.filter((match) => match.day >= from && match.day <= to);
  const previous = matches.filter((match) => match.day >= from && match.day < to);
  const previousRows = standingsForMatches(teams, previous);
  return standingsForMatches(teams, ranged, new Map(previousRows.map((row) => [row.id, row.position])));
}

export function buildCoppaPrototype(teams: CoppaTeam[], seed = 20260813) {
  const ordered = teams.slice(0, 100);
  const matches: CoppaMatch[] = [];
  for (let day = 1; day <= 14; day += 1) {
    for (let index = 0; index < Math.floor(ordered.length / 2); index += 1) {
      const home = ordered[(index + day - 1) % ordered.length];
      const away = ordered[(ordered.length - 1 - index + day - 1) % ordered.length];
      if (home.id === away.id) continue;
      const homeScore = 58 + ((home.id * 7 + day * 3 + seed) % 34) / 2;
      const awayScore = 58 + ((away.id * 5 + day * 2 + seed) % 34) / 2;
      matches.push({ id: `${day}-${index}`, day, home, away, homeGoals: Math.max(0, Math.floor((homeScore - 60) / 6)), awayGoals: Math.max(0, Math.floor((awayScore - 60) / 6)), homeScore, awayScore, status: "calcolata" });
    }
  }
  const standingsByDay: Record<number, CoppaStanding[]> = {};
  for (let day = 1; day <= 14; day += 1) standingsByDay[day] = coppaStandingsForRange(ordered, matches, 1, day);
  return { matches, standings: standingsByDay[14], standingsByDay };
}

export type CoppaSortKey = "official" | "points" | "totalPoints" | "goalsFor" | "goalsAgainst";
export function sortCoppaStandings(rows: CoppaStanding[], key: CoppaSortKey, direction: "asc" | "desc") {
  if (key === "official") return [...rows].sort((a, b) => a.position - b.position);
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => ((a[key] - b[key]) * sign) || a.position - b.position);
}

export const qualificationSeparators = new Map([
  [8, { desktop: "QUALIFICATE AGLI OTTAVI", mobile: "OTTAVI" }],
  [16, { desktop: "QUALIFICATE AI SEDICESIMI", mobile: "SEDICESIMI" }],
  [24, { desktop: "QUALIFICATE AI TRENTADUESIMI", mobile: "32ESIMI" }],
  [32, { desktop: "ACCESSO AL 3° TURNO PLAYOFF", mobile: "3°T PLAYOFF" }],
  [64, { desktop: "ACCESSO AL 1° TURNO PLAYOFF", mobile: "1°T PLAYOFF" }],
]);

export function qualificationFor(position: number) {
  if (position <= 8) return { short: "OTTAVI", full: "Accesso diretto agli Ottavi", tone: "border-amber-300 bg-amber-100 text-amber-900" };
  if (position <= 16) return { short: "SEDIC.", full: "Accesso ai Sedicesimi", tone: "border-blue-300 bg-blue-50 text-blue-900" };
  if (position <= 24) return { short: "32ESIMI", full: "Accesso ai Trentaduesimi", tone: "border-sky-200 bg-sky-50 text-sky-800" };
  if (position <= 32) return { short: "3°T PO", full: "Terzo turno playoff", tone: "border-slate-300 bg-slate-50 text-slate-700" };
  if (position <= 64) return { short: "1°T PO", full: "Primo turno playoff", tone: "border-slate-200 bg-white text-slate-600" };
  return { short: "OUT", full: "Non qualificata", tone: "border-slate-300 bg-slate-100 text-slate-600" };
}
