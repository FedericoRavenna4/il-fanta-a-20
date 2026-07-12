import { getPalmares } from "./palmares";
import { getRanking } from "./ranking";
import { getSocieta } from "./societa";

export function getRankingRows() {
  const ranking = getRanking();
  const societa = getSocieta();
  const palmares = getPalmares();

  return ranking.map((item) => {
    const team = societa.find((societaItem) => societaItem.id === item.squadraId);
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
        logo: team.logo,
        legaAttuale: team.legaAttuale,
        stagioneIngresso: team.stagioneIngresso,
        fantallenatore: team.fantallenatore,
        nicknameInstagram: team.nicknameInstagram,
      } : null,
      trofei: { totaleTrofei: trofei?.totaleTrofei ?? 0 },
    };
  });
}

export type RankingRow = ReturnType<typeof getRankingRows>[number];
