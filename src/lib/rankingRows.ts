import { getPalmares } from "./palmares";
import { getRanking } from "./ranking";
import { getActiveSocietaCatalog } from "./societa/catalog.server";

function currentLeague(category: string | null, group: string | null) {
  if (!category) return null;
  return group ? `${category} - Girone ${group.replace(/^girone\s+/i, "")}` : category;
}

export async function getRankingRows() {
  const ranking = getRanking();
  const societa = await getActiveSocietaCatalog();
  const societaById = new Map(societa.map((team) => [team.id, team]));
  const palmares = getPalmares();

  return ranking.map((item) => {
    const team = societaById.get(item.squadraId);
    const trofei = palmares.find((palmaresItem) => palmaresItem.squadraId === item.squadraId);

    return {
      posizione: item.posizione,
      squadraId: item.squadraId,
      nomeRanking: item.nomeRanking,
      puntiRanking: item.puntiRanking,
      team: team ? {
        id: team.id,
        nome: team.nome,
        slug: team.slug,
        logo: team.logo_path ?? "/logo.png",
        legaAttuale: currentLeague(team.categoria, team.girone),
        stagioneIngresso: team.stagione_ingresso,
        fantallenatore: team.fantallenatore,
        nicknameInstagram: team.nickname_instagram,
      } : null,
      trofei: { totaleTrofei: trofei?.totaleTrofei ?? 0 },
    };
  });
}

export type RankingRow = Awaited<ReturnType<typeof getRankingRows>>[number];
