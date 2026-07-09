import { getRanking } from "@/lib/ranking";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";
import RankingClient from "./RankingClient";

export default function RankingPage() {
  const ranking = getRanking();
  const societa = getSocieta();
  const palmares = getPalmares();

  const rows = ranking.map((item) => {
    const team = societa.find((societa) => societa.id === item.squadraId);
    const trofei = palmares.find((p) => p.squadraId === item.squadraId);

    return {
      posizione: item.posizione,
      squadraId: item.squadraId,
      nomeRanking: item.nomeRanking,
      puntiRanking: item.puntiRanking,
      team: team
        ? {
            id: team.id,
            nome: team.nome,
            slug: team.slug,
            logo: team.logo,
            legaAttuale: team.legaAttuale,
            fantallenatore: team.fantallenatore,
            nicknameInstagram: team.nicknameInstagram,
          }
        : null,
      trofei: {
        totaleTrofei: trofei?.totaleTrofei ?? 0,
      },
    };
  });

  return <RankingClient rows={rows} />;
}