import type { CurrentSocieta } from "@/lib/societa/current.server";
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

const normalizeGroup = (value: string | null) => value?.replace(/^girone\s+/i, "").trim().toUpperCase() ?? null;

function belongsToLeague(team: CurrentSocieta, sourceName: string) {
  const [category, expectedGroup = null] = sourceName.split(" - Girone ");
  const embeddedGroup = team.categoria?.match(/^Serie C\s*-\s*Girone\s+(.+)$/i)?.[1] ?? null;
  const actualCategory = embeddedGroup ? "Serie C" : team.categoria;
  const actualGroup = normalizeGroup(embeddedGroup ?? team.girone);
  return actualCategory === category && actualGroup === expectedGroup;
}

function toMockTeam(team: CurrentSocieta): MockTeam {
  return { id: team.id, name: team.nome, logo: team.logo_path ?? "/logo.png", slug: team.slug };
}

function score(seed: number) {
  return Number((65 + ((seed * 17) % 190) / 10).toFixed(1));
}

function goals(fantasyScore: number) {
  if (fantasyScore < 66) return 0;
  return 1 + Math.floor((fantasyScore - 66) / 6);
}

function createSchedule(teams: MockTeam[], leagueOffset: number, seed: number, filled: boolean) {
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
      const played = filled || day <= 3;
      const homeScore = played ? score(home.id + day * 11 + leagueOffset + seed) : null;
      const awayScore = played ? score(away.id + day * 13 + leagueOffset + seed + 7) : null;
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

export function createChampionshipMockData(societa: CurrentSocieta[], seed = 20260813, filled = false): LeagueMock[] {
  return leagueDefinitions.map((league, leagueIndex) => {
    const teams = societa
      .filter((team) => belongsToLeague(team, league.sourceName))
      .slice(0, 20)
      .map(toMockTeam);
    return {
      id: league.id,
      name: league.name,
      shortName: league.shortName,
      currentMatchday: filled ? 38 : 3,
      teams,
      matchdays: teams.length === 20 ? createSchedule(teams, leagueIndex * 101, seed, filled) : {},
    };
  });
}
