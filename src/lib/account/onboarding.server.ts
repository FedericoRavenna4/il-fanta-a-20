import "server-only";

import { getCatalogoEmblemi, getEmblemiSocieta } from "@/lib/emblemi";
import { getRanking } from "@/lib/ranking";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import { getSocietaTrophyCounts } from "./support-catalog.server";
import type { OnboardingTeam } from "./onboarding";

export async function getOnboardingTeamCatalog(): Promise<OnboardingTeam[]> {
  const teams = await getActiveSocietaCatalog();
  const trophyCounts = getSocietaTrophyCounts();
  const rankingById = new Map(getRanking().map((row) => [row.squadraId, row.posizione]));
  const emblemTotal = getCatalogoEmblemi().length;
  const newEntryIds = new Set(teams.filter((team) => team.badge_tipo === "new_entry").map((team) => team.id));
  const emblemStats = new Map(getEmblemiSocieta(newEntryIds).map((team) => [
    team.squadraId,
    {
      unlocked: team.emblemi.filter((emblem) => emblem.stato === "Sbloccato").length,
      defending: team.emblemi.filter((emblem) => emblem.stato === "Da difendere").length,
    },
  ]));

  return teams.flatMap((team) => {
    if (!team.categoria) return [];
    const emblems = emblemStats.get(team.id);
    return [{
      id: team.id,
      name: team.nome,
      logo: team.logo_path ?? "/logos/logo.png",
      league: team.categoria === "Serie C" && team.girone ? `Serie C Girone ${team.girone}` : team.categoria,
      category: team.categoria,
      group: team.girone,
      ranking: rankingById.get(team.id) ?? 999,
      trophies: trophyCounts.get(team.id) ?? 0,
      emblemsUnlocked: emblems?.unlocked ?? 0,
      emblemsTotal: emblemTotal,
      emblemsDefending: emblems?.defending ?? 0,
      story: team.storia_tifo?.trim() ?? "",
    }];
  });
}
