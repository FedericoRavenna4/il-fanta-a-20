import Image from "next/image";
import { getRanking } from "@/lib/ranking";
import { getSocieta } from "@/lib/societa";

export default function RankingPage() {
  const ranking = getRanking();
  const societa = getSocieta();

  const rows = ranking.map((item) => {
    const team = societa.find(
      (societa) => societa.id === item.squadraId
    );

    return {
      ...item,
      team,
    };
  });

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="uppercase tracking-[0.3em] text-sm text-slate-500 mb-3">
          Classifica storica
        </p>

        <h1 className="text-5xl font-bold text-blue-950 mb-4">
          Ranking
        </h1>

        <p className="text-slate-600 max-w-2xl">
          La graduatoria storica delle società del Fanta a 20.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.posizione}
            className={`rounded-3xl border p-5 shadow-sm flex items-center gap-5 ${
              row.posizione === 1
                ? "border-yellow-300 bg-yellow-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="w-16 text-center">
              <span className="text-3xl font-bold text-blue-950">
                #{row.posizione}
              </span>
            </div>

            <div className="w-20 flex justify-center">
              {row.team && (
                <Image
                  src={row.team.logo}
                  alt={row.team.nome}
                  width={60}
                  height={60}
                  className="max-h-16 w-auto object-contain"
                />
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-950">
                {row.team?.nome ?? row.nomeRanking}
              </h2>

              <p className="text-sm text-slate-500">
                {row.team?.legaAttuale}
              </p>
            </div>

            {row.posizione === 1 && (
              <div className="hidden md:block">
                <span className="rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-white">
                  👑 Leader Ranking
                </span>
              </div>
            )}

            <div className="text-right min-w-[120px]">
              <p className="text-sm text-slate-500">
                Punti Ranking
              </p>

              <p className="text-3xl font-bold text-blue-950">
                {row.puntiRanking}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}