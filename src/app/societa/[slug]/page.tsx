import Image from "next/image";
import { notFound } from "next/navigation";
import { getSocieta } from "@/lib/societa";

export default async function SchedaSocietaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const societa = getSocieta();
  const team = societa.find((item) => item.slug === slug);

  if (!team) {
    notFound();
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
          <Image
            src={team.logo}
            alt={team.nome}
            width={180}
            height={180}
            className="mx-auto mb-8 max-h-44 w-auto object-contain"
          />

          <h1 className="text-5xl font-bold text-blue-950 mb-4">
            {team.nome}
          </h1>

          <p className="text-slate-500 mb-6">{team.legaAttuale}</p>

          {team.leader && (
            <p className="inline-block rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-white">
              👑 Leader Ranking
            </p>
          )}

          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm text-slate-500">Ranking</p>
              <p className="text-3xl font-bold text-blue-950">
                #{team.ranking}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm text-slate-500">Dal</p>
              <p className="text-3xl font-bold text-blue-950">
                {team.stagioneIngresso}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-blue-950 mb-6">
            Dettagli società
          </h2>

          <div className="space-y-5 text-slate-600">
            <div>
              <p className="text-sm text-slate-400">Fantallenatore</p>
              <p className="font-semibold text-slate-700">
                {team.fantallenatore}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Nickname Instagram</p>
              <p className="font-semibold text-slate-700">
                {team.nicknameInstagram || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Club rappresentato</p>
              <p className="font-semibold text-slate-700">
                {team.squadraReale}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Lega attuale</p>
              <p className="font-semibold text-slate-700">
                {team.legaAttuale}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-950 mb-3">
          Storia della società
        </h2>

        <p className="text-slate-500">
          Ranking, palmarès e risultati stagionali verranno collegati nelle
          prossime fasi.
        </p>
      </div>
    </section>
  );
}