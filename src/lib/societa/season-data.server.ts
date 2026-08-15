import "server-only";

import { loadChampionshipData } from "@/app/campionati-live-preview/data";
import type { LeagueData, LiveChampionshipData, Match } from "@/app/campionati-live-preview/types";
import { createChampionshipMockData } from "@/app/campionati-preview/mock-data";
import { buildCoppaPrototype } from "@/app/coppe/coppa-fanta-fixture";
import { loadActiveCoppaData, type CoppaData } from "@/app/coppe/data";
import { getDemoSeed, isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";

export type SocietaSeasonData = {
  demo: boolean;
  championships: LiveChampionshipData | null;
  coppa: CoppaData;
};

export async function loadSocietaSeasonData(): Promise<SocietaSeasonData> {
  if (!isGlobalFakeDataEnabled()) {
    const [championships, coppa] = await Promise.all([
      loadChampionshipData(),
      loadActiveCoppaData(),
    ]);
    return { demo: false, championships, coppa };
  }

  const catalog = await getActiveSocietaCatalog();
  const leagues = createChampionshipMockData(catalog, getDemoSeed(), false).map((league): LeagueData => {
    const matches: Match[] = Object.entries(league.matchdays).flatMap(([day, rows]) => rows.map((match) => ({
      ...match,
      matchday: Number(day),
      serieAMatchday: Number(day),
      status: match.homeGoals === null ? "programmata" : "calcolata",
    })));
    return {
      id: league.id,
      competitionCode: league.id,
      name: league.name,
      shortName: league.shortName,
      found: true,
      initialMatchday: league.currentMatchday,
      availableMatchdays: Object.keys(league.matchdays).map(Number),
      teams: league.teams,
      matches,
    };
  });
  const teams = catalog.slice(0, 100).map((team) => ({
    id: team.id,
    name: team.nome,
    slug: team.slug,
    logo: team.logo_path ?? "/logos/logo.png",
  }));
  const prototype = buildCoppaPrototype(teams, getDemoSeed());
  return {
    demo: true,
    championships: { season: { id: -1, code: "demo", name: "Stagione demo" }, seasons: [], leagues },
    coppa: { teams, matches: prototype.matches, initialDay: 14, hasCalendar: prototype.matches.length > 0 },
  };
}
