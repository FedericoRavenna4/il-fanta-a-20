import Image from "next/image";
import { notFound } from "next/navigation";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";
import { getRose } from "@/lib/rose";
import RosaSocieta from "./RosaSocieta";

function getLegaGradient(lega: string) {
  if (lega === "Serie A") return "from-sky-500 via-sky-600 to-blue-900";
  if (lega === "Serie B") return "from-emerald-500 via-emerald-600 to-blue-900";
  if (lega.startsWith("Serie C")) return "from-violet-500 via-violet-600 to-blue-900";
  return "from-blue-950 via-blue-900 to-blue-800";
}

export default async function SchedaSocietaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const societa = getSocieta();
  const palmares = getPalmares();
  const rose = getRose();

  const team = societa.find((item) => item.slug === slug);

  if (!team) {
    notFound();
  }

  const trofei = palmares.find((item) => item.squadraId === team.id);
  const rosaTeam = rose.filter((item) => item.squadraId === team.id);
  const legaGradient = getLegaGradient(team.legaAttuale);

  const palmaresCards = [
    { label: "Campionati", value: trofei?.campionati ?? 0, image: "/trofei/campionato.png" },
    { label: "Champions League", value: trofei?.championsLeague ?? 0, image: "/trofei/champions.png" },
    { label: "Europa League", value: trofei?.europaLeague ?? 0, image: "/trofei/europa-league.png" },
    { label: "Conference League", value: trofei?.conferenceLeague ?? 0, image: "/trofei/conference-league.png" },
    { label: "Coppa Fanta a 20", value: trofei?.coppaFantaA20 ?? 0, image: "/trofei/coppa-fanta-a-20.png" },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className={`bg-gradient-to-r ${legaGradient} px-8 py-8 text-white`}>
            <p className="text-sm uppercase tracking-[0.3em] text-white/80">
              Scheda società
            </p>
          </div>

          <div className="p-10 text-center">
            <Image
              src={team.logo}
              alt={team.nome}
              width={220}
              height={220}
              className="mx-auto mb-8 max-h-56 w-auto object-contain"
            />

            <h1 className="text-5xl font-extrabold text-blue-950 mb-4">
              {team.nome}
            </h1>

            <p className="text-slate-500 mb-6">{team.legaAttuale}</p>

            <div className="flex flex-wrap justify-center gap-3">
              {team.leader && (
                <div className="rounded-full bg-red-100 border border-red-200 px-4 py-2 text-sm font-bold text-red-700">
                  ⭐ Ranking Leader
                </div>
              )}

              {team.badgeNewEntry && (
                <div className="rounded-full bg-sky-100 border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700">
                  🆕 New Entry
                </div>
              )}

              {team.badgeNeopromossa && (
                <div className="rounded-full bg-emerald-100 border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700">
                  ⬆️ Neopromossa
                </div>
              )}

              {team.badgeCampioneSerieA && (
                <div className="rounded-full bg-amber-100 border border-amber-300 px-4 py-2 text-sm font-bold text-amber-700">
                  🏆 Campione in carica
                </div>
              )}
            </div>

            <div className="mt-10 grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Ranking</p>
                <p className="text-3xl font-bold text-blue-950">#{team.ranking}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Punti ranking</p>
                <p className="text-3xl font-bold text-blue-950">{team.puntiRanking}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Trofei</p>
                <p className="text-3xl font-bold text-blue-950">
                  {trofei?.totaleTrofei ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-blue-950 mb-6">
            Dettagli società
          </h2>

          <div className="space-y-5 text-slate-600">
            <div>
              <p className="text-sm text-slate-400">Fantallenatore</p>
              <p className="font-semibold text-slate-700">{team.fantallenatore}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Nickname Instagram</p>
              <p className="font-semibold text-slate-700">
                {team.nicknameInstagram || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Club rappresentato</p>
              <p className="font-semibold text-slate-700">{team.squadraReale}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Lega attuale</p>
              <p className="font-semibold text-slate-700">{team.legaAttuale}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Presente dal</p>
              <p className="font-semibold text-slate-700">{team.stagioneIngresso}</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-950 mb-6">Palmarès</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {palmaresCards.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-5 text-center">
              <div className="mx-auto mb-4 flex h-20 items-center justify-center">
                <Image
                  src={item.image}
                  alt={item.label}
                  width={80}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>

              <p className="text-4xl font-bold text-blue-950">{item.value}</p>
              <p className="text-sm text-slate-500 mt-2">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <RosaSocieta rosa={rosaTeam} isNewEntry={team.badgeNewEntry} />

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-950 mb-3">
          Storia della società
        </h2>

        <p className="text-slate-500">
          I risultati stagionali verranno collegati nelle prossime fasi.
        </p>
      </div>
    </section>
  );
}