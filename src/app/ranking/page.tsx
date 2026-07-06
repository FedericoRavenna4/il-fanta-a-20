import Image from "next/image";
import { getRanking } from "@/lib/ranking";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";

export default function RankingPage() {
  const ranking = getRanking();
  const societa = getSocieta();
  const palmares = getPalmares();

  const rows = ranking.map((item) => {
    const team = societa.find((societa) => societa.id === item.squadraId);
    const trofei = palmares.find((p) => p.squadraId === item.squadraId);

    return {
      ...item,
      team,
      trofei,
    };
  });

  const leader = rows[0];
  const podio = rows.slice(0, 3);
  const restoClassifica = rows.slice(3);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-14">
        <p className="uppercase tracking-[0.35em] text-sm text-slate-500 mb-4">
          Classifica storica
        </p>

        <h1 className="text-6xl font-extrabold text-blue-950 mb-5">
          Ranking
        </h1>

        <p className="text-slate-600 max-w-2xl text-lg">
          La graduatoria storica delle società del Fanta a 20. Punti, risultati
          e trofei raccontano il percorso costruito stagione dopo stagione.
        </p>
      </div>

      {leader?.team && (
        <div className="mb-12 overflow-hidden rounded-[2rem] border border-blue-200 bg-blue-950 text-white shadow-xl">
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 p-10 items-center">
            <div>
              <p className="uppercase tracking-[0.3em] text-sm text-blue-200 mb-4">
                Leader Ranking
              </p>

              <h2 className="text-5xl font-extrabold mb-4">
                {leader.team.nome}
              </h2>

              <p className="text-blue-100 mb-8">
                La società numero uno nella storia del Fanta a 20.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-blue-200">Posizione</p>
                  <p className="text-3xl font-bold">#1</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-blue-200">Punti</p>
                  <p className="text-3xl font-bold">
                    {leader.puntiRanking}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-blue-200">Trofei</p>
                  <p className="text-3xl font-bold">
                    {leader.trofei?.totaleTrofei ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-10 flex items-center justify-center">
              <Image
                src={leader.team.logo}
                alt={leader.team.nome}
                width={220}
                height={220}
                className="max-h-56 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-blue-950 mb-6">
          Podio storico
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {podio.map((row) => (
            <div
              key={row.posizione}
              className={`rounded-3xl border p-7 text-center shadow-sm ${
                row.posizione === 1
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-white border-slate-200"
              }`}
            >
              <p className="text-4xl mb-4">
                {row.posizione === 1
                  ? "🥇"
                  : row.posizione === 2
                  ? "🥈"
                  : "🥉"}
              </p>

              {row.team && (
                <Image
                  src={row.team.logo}
                  alt={row.team.nome}
                  width={100}
                  height={100}
                  className="mx-auto mb-5 max-h-28 w-auto object-contain"
                />
              )}

              <h3 className="text-2xl font-bold text-blue-950">
                {row.team?.nome ?? row.nomeRanking}
              </h3>

              <p className="mt-2 text-slate-500">
                {row.puntiRanking} punti
              </p>

              <p className="mt-4 text-sm font-semibold text-blue-900">
                {row.trofei?.totaleTrofei ?? 0} trofei
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white/85 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-blue-950">
            Classifica completa
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {restoClassifica.map((row) => (
            <div
              key={row.posizione}
              className="grid grid-cols-[70px_70px_1fr_120px_100px] items-center gap-4 p-5 hover:bg-slate-50 transition"
            >
              <p className="text-2xl font-bold text-blue-950">
                #{row.posizione}
              </p>

              <div>
                {row.team && (
                  <Image
                    src={row.team.logo}
                    alt={row.team.nome}
                    width={52}
                    height={52}
                    className="max-h-14 w-auto object-contain"
                  />
                )}
              </div>

              <div>
                <h3 className="font-bold text-blue-950">
                  {row.team?.nome ?? row.nomeRanking}
                </h3>
                <p className="text-sm text-slate-500">
                  {row.team?.legaAttuale}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Punti</p>
                <p className="text-xl font-bold text-blue-950">
                  {row.puntiRanking}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Trofei</p>
                <p className="text-xl font-bold text-blue-950">
                  {row.trofei?.totaleTrofei ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}