import type { Societa } from "@/lib/societa";
import type { LeagueId, LeagueMock, MockMatch, MockTeam } from "./types";

export const MOCK_DATA_NOTICE = "Dati simulati locali · nessun collegamento a Supabase";

const leagueDefinitions: Array<{
  id: LeagueId;
  name: string;
  shortName: string;
  sourceName: string;
}> = [
  { id: "serie-a", name: "Serie A", shortName: "Serie A", sourceName: "Serie A" },
  { id: "serie-b", name: "Serie B", shortName: "Serie B", sourceName: "Serie B" },
  { id: "serie-c-a", name: "Serie C Girone A", shortName: "C · A", sourceName: "Serie C - Girone A" },
  { id: "serie-c-b", name: "Serie C Girone B", shortName: "C · B", sourceName: "Serie C - Girone B" },
  { id: "serie-c-c", name: "Serie C Girone C", shortName: "C · C", sourceName: "Serie C - Girone C" },
];

function toMockTeam(team: Societa): MockTeam {
  return { id: team.id, name: team.nome, logo: team.logo };
}

function score(seed: number) {
  return Number((65 + ((seed * 17) % 190) / 10).toFixed(1));
}

function goals(fantasyScore: number) {
  if (fantasyScore < 66) return 0;
  return 1 + Math.floor((fantasyScore - 66) / 6);
}

function createSchedule(teams: MockTeam[], leagueOffset: number) {
  const rotating = [...teams];
  const firstLeg: MockTeam[][] = [];

  for (let round = 0; round < 19; round += 1) {
    firstLeg.push([...rotating]);
    rotating.splice(1, 0, rotating.pop()!);
  }

  const matchdays: Record<number, MockMatch[]> = {};
  for (let day = 1; day <= 38; day += 1) {
    const secondLeg = day > 19;
    const roundTeams = firstLeg[(day - 1) % 19];
    matchdays[day] = Array.from({ length: 10 }, (_, index) => {
      const first = roundTeams[index];
      const second = roundTeams[19 - index];
      const home = secondLeg ? second : first;
      const away = secondLeg ? first : second;
      const played = day <= 3;
      const homeScore = played ? score(home.id + day * 11 + leagueOffset) : null;
      const awayScore = played ? score(away.id + day * 13 + leagueOffset + 7) : null;
      return {
        id: `${leagueOffset}-${day}-${index}`,
        home,
        away,
        homeGoals: homeScore === null ? null : goals(homeScore),
        awayGoals: awayScore === null ? null : goals(awayScore),
        homeScore,
        awayScore,
      };
    });
  }
  return matchdays;
}

export function createChampionshipMockData(societa: Societa[]): LeagueMock[] {
  return leagueDefinitions.map((league, leagueIndex) => {
    const selected = societa.filter((team) => team.legaAttuale === league.sourceName).slice(0, 20);
    const fallback = societa.slice(leagueIndex * 20, leagueIndex * 20 + 20);
    const teams = (selected.length === 20 ? selected : fallback).map(toMockTeam);
    return {
      id: league.id,
      name: league.name,
      shortName: league.shortName,
      currentMatchday: 3,
      teams,
      matchdays: createSchedule(teams, leagueIndex * 101),
    };
  });
}

