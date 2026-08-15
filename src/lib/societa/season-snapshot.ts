import { standingsAt } from "../../app/campionati-live-preview/logic.ts";
import type { LeagueData, Match, StandingRow } from "../../app/campionati-live-preview/types";
import { coppaStandingsForRange, qualificationFor, type CoppaMatch, type CoppaTeam } from "../../app/coppe/coppa-fanta-fixture.ts";

export type TeamMatchSnapshot = { match: Match; opponent: Match["home"]; isHome: boolean };
export type CupSnapshot = { code: string; name: string; href: string; position: number; points: number; totalPoints: number; phase: string };
export type FormSnapshot = {
  outcome: "V" | "P" | "S" | null;
  score: string | null;
  opponent: Match["home"];
  isHome: boolean;
  matchday: number;
};
export type SocietaSeasonSnapshot = {
  leagueName: string | null;
  leagueHref: string;
  lastMatch: TeamMatchSnapshot | null;
  nextMatch: TeamMatchSnapshot | null;
  standing: StandingRow | null;
  form: FormSnapshot[];
  cups: CupSnapshot[];
};

const belongsTo = (match: Match, teamId: number) => match.home.id === teamId || match.away.id === teamId;
const isCalculated = (match: Match) => match.status === "calcolata" && match.homeGoals !== null && match.awayGoals !== null;

function matchSnapshot(match: Match | undefined, teamId: number): TeamMatchSnapshot | null {
  if (!match) return null;
  const isHome = match.home.id === teamId;
  return { match, isHome, opponent: isHome ? match.away : match.home };
}

export function deriveSocietaSeasonSnapshot(
  teamId: number,
  leagues: LeagueData[],
  cup: { teams: CoppaTeam[]; matches: CoppaMatch[]; hasCalendar: boolean } | null,
): SocietaSeasonSnapshot {
  const league = leagues.find((item) => item.teams.some((team) => team.id === teamId)) ?? null;
  const teamMatches = (league?.matches ?? []).filter((match) => belongsTo(match, teamId));
  const played = teamMatches.filter(isCalculated).sort((a, b) => a.matchday - b.matchday || String(a.id).localeCompare(String(b.id)));
  const future = teamMatches.filter((match) => match.status === "programmata").sort((a, b) => a.matchday - b.matchday || String(a.id).localeCompare(String(b.id)));
  const lastMatch = matchSnapshot(played.at(-1), teamId);
  const nextMatch = matchSnapshot(future[0], teamId);
  const lastDay = Math.max(0, ...played.map((match) => match.matchday));
  const standing = league && lastDay > 0 ? standingsAt(league.teams, league.matches, lastDay).find((row) => row.id === teamId) ?? null : null;
  const formMatches = played.length >= 5 ? played.slice(-5) : [...played, ...future.slice(0, 5 - played.length)];
  const form = formMatches.map((match): FormSnapshot => {
    const isHome = match.home.id === teamId;
    const opponent = isHome ? match.away : match.home;
    if (!isCalculated(match)) return { outcome: null, score: null, opponent, isHome, matchday: match.matchday };
    const own = match.home.id === teamId ? match.homeGoals! : match.awayGoals!;
    const other = match.home.id === teamId ? match.awayGoals! : match.homeGoals!;
    const outcome: FormSnapshot["outcome"] = own > other ? "V" : own < other ? "S" : "P";
    return { outcome, score: `${own}-${other}`, opponent, isHome, matchday: match.matchday };
  });

  const cupCalculated = cup?.matches.filter((match) => match.status === "calcolata") ?? [];
  const cupLastDay = Math.max(0, ...cupCalculated.map((match) => match.day));
  const cupQualificationComplete = Boolean(cup?.hasCalendar && cup.matches.length > 0 && cup.matches.every((match) => match.status === "calcolata"));
  const cupRow = cup?.hasCalendar && cupLastDay > 0
    ? coppaStandingsForRange(cup.teams, cup.matches, 1, cupLastDay).find((row) => row.id === teamId) ?? null
    : null;
  const cups: CupSnapshot[] = cupRow ? [{
    code: "coppa-fanta-20",
    name: "Coppa Fanta a 20",
    href: "/coppe?vista=classifica",
    position: cupRow.position,
    points: cupRow.points,
    totalPoints: cupRow.totalPoints,
    phase: cupQualificationComplete ? qualificationFor(cupRow.position).full : `Fase di qualificazione · Giornata ${cupLastDay}`,
  }] : [];

  return { leagueName: league?.name ?? null, leagueHref: league ? `/campionati-live-preview?lega=${league.id}&vista=classifica` : "/campionati-live-preview", lastMatch, nextMatch, standing, form, cups };
}
