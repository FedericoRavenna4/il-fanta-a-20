import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";
import { getRose } from "@/lib/rose";
import { getRisultati } from "@/lib/risultati";
import { getStatisticheGiocatori } from "@/lib/statisticheGiocatori";
import { getStorieSocieta } from "@/lib/storieSocieta";
import RosaSocieta from "./RosaSocieta";
import StoriaSocieta from "./StoriaSocieta";

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
  const risultati = getRisultati();
  const storieSocieta = getStorieSocieta();
const statisticheGiocatori = getStatisticheGiocatori();
  const team = societa.find((item) => item.slug === slug);

  if (!team) {
    notFound();
  }

  const trofei = palmares.find((item) => item.squadraId === team.id);
  const rosaTeam = rose.filter((item) => item.squadraId === team.id);
  const risultatiTeam = risultati.filter((item) => item.squadraId === team.id);
  const storiaEditoriale = storieSocieta.find(
    (item) => item.squadraId === team.id
  );

  const legaGradient = getLegaGradient(team.legaAttuale);

  const palmaresCards = [
    {
      value: trofei?.campionati ?? 0,
      image: "/trofei/scudetto-a.png",
      style:
        "border-sky-200 bg-gradient-to-br from-sky-200 via-sky-50 to-white shadow-sky-100",
      glow: "drop-shadow-[0_0_26px_rgba(14,165,233,0.85)]",
    },
    {
      value: trofei?.championsLeague ?? 0,
      image: "/trofei/champions-league.png",
      style:
        "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 shadow-blue-950/30",
      glow: "drop-shadow-[0_0_30px_rgba(147,197,253,0.95)]",
      dark: true,
    },
    {
      value: trofei?.europaLeague ?? 0,
      image: "/trofei/europa-league.png",
      style:
        "border-orange-400 bg-gradient-to-br from-orange-500 via-orange-300 to-orange-100 shadow-orange-200",
      glow: "drop-shadow-[0_0_30px_rgba(251,146,60,0.95)]",
    },
    {
      value: trofei?.conferenceLeague ?? 0,
      image: "/trofei/conference-league.png",
      style:
        "border-emerald-900/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 shadow-emerald-950/30",
      glow: "drop-shadow-[0_0_30px_rgba(110,231,183,0.9)]",
      dark: true,
    },
    {
      value: trofei?.coppaFantaA20 ?? 0,
      image: "/trofei/coppa-fanta-a-20.png",
      style:
        "border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-100 to-white shadow-amber-200",
      glow: "drop-shadow-[0_0_34px_rgba(251,191,36,1)]",
    },
  ].filter((item) => item.value > 0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
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
              width={280}
              height={280}
              className="mx-auto mb-8 max-h-72 w-auto object-contain drop-shadow-sm transition hover:scale-105 hover:drop-shadow-[0_22px_30px_rgba(14,116,144,0.35)]"
            />

            <h1 className="mb-4 text-5xl font-black text-blue-950">
              {team.nome}
            </h1>

            <p className="mb-6 font-semibold text-slate-500">
              {team.legaAttuale}
            </p>

            <div className="mb-8 flex flex-wrap justify-center gap-3">
              {team.leader && (
                <div className="rounded-full border border-red-200 bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                  ⭐ Ranking Leader
                </div>
              )}

              {team.badgeNewEntry && (
                <div className="rounded-full border border-sky-200 bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
                  🆕 New Entry
                </div>
              )}

              {team.badgeNeopromossa && (
                <div className="rounded-full border border-emerald-200 bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                  ⬆️ Neopromossa
                </div>
              )}

              {team.badgeCampioneSerieA && (
                <div className="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                  🏆 Campione in carica
                </div>
              )}
            </div>

            {storiaEditoriale?.descrizione && (
              <div className="mx-auto mb-9 max-w-4xl rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-white p-6 text-left shadow-md shadow-sky-100/70">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-sky-600">
                  Identità storica
                </p>

                <div className="mb-4 h-[4px] w-40 rounded-full bg-gradient-to-r from-blue-950 via-sky-500 to-transparent" />

                <p className="text-[17px] font-semibold leading-8 text-slate-600">
                  {storiaEditoriale.descrizione}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/ranking"
                className="rounded-2xl bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-500">Ranking</p>
                <p className="text-3xl font-black text-blue-950">
                  #{team.ranking}
                </p>
              </Link>

              <Link
                href="#rose"
                className="rounded-2xl bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-500">Rose</p>
                <p className="text-2xl font-black text-blue-950">
                  Visualizza
                </p>
              </Link>

              <Link
                href="#storia"
                className="rounded-2xl bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-500">Storia</p>
                <p className="text-2xl font-black text-blue-950">
                  Esplora
                </p>
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-sm">
            <h2 className="mb-6 text-2xl font-black text-blue-950">
              Dettagli società
            </h2>

            <div className="space-y-5 text-slate-600">
              <div>
                <p className="text-sm text-slate-400">Fantallenatore</p>
                <p className="font-bold text-slate-700">
                  {team.fantallenatore}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Lega attuale</p>
                <p className="font-bold text-slate-700">
                  {team.legaAttuale}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Presente dal</p>
                <p className="font-bold text-slate-700">
                  {team.stagioneIngresso}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-sm">
            <h2 className="mb-6 text-2xl font-black text-blue-950">
              Palmarès
            </h2>

            {palmaresCards.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {palmaresCards.map((item, index) => (
                  <div
                    key={index}
                    className={`relative flex h-[108px] w-[88px] flex-col items-center justify-center overflow-hidden rounded-2xl border shadow-md ${item.style}`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />

                    <Image
                      src={item.image}
                      alt="Trofeo"
                      width={92}
                      height={92}
                      className={`relative z-10 max-h-[74px] w-auto object-contain ${item.glow}`}
                    />

                    <p
                      className={`relative z-10 -mt-2 text-base font-black ${
                        item.dark ? "text-white" : "text-blue-950"
                      }`}
                    >
                      x{item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Nessun trofeo ancora registrato.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-sm">
            <h2 className="mb-3 text-2xl font-black text-blue-950">
              Trofei sbloccabili
            </h2>

            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              In arrivo...
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-sm">
            <h2 className="mb-3 text-2xl font-black text-blue-950">
              Trofei da difendere
            </h2>

            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              In arrivo...
            </p>
          </div>
        </aside>
      </div>

      <div id="storia">
  <StoriaSocieta
    risultati={risultatiTeam}
    nomeSocieta={team.nome}
    squadraId={team.id}
    isNewEntry={team.badgeNewEntry}
    descrizioneEditoriale={storiaEditoriale?.descrizione}
  />
</div>

<div id="rose">
  <RosaSocieta
    rosa={rosaTeam}
    isNewEntry={team.badgeNewEntry}
    statistiche={statisticheGiocatori}
  />
</div>
    </section>
  );
}