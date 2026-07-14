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
import { getEmblemi } from "@/lib/emblemi";
import EmblemiSocieta from "./EmblemiSocieta";
import PalmaresSocieta from "./PalmaresSocieta";

function getLegaGradient(lega: string) {
  if (lega === "Serie A") return "from-sky-500 via-sky-600 to-blue-900";
  if (lega === "Serie B") return "from-emerald-500 via-emerald-600 to-blue-900";
  if (lega.startsWith("Serie C")) return "from-violet-500 via-violet-600 to-blue-900";
  return "from-blue-950 via-blue-900 to-blue-800";
}
type EmblemaInfo = {
  titolo: string;
  descrizione: string;
  rarita: "Base" | "Comune" | "Raro" | "Leggendario";
};

const infoEmblemi: Record<string, EmblemaInfo> = {
  un_anno: {
    titolo: "Primo anno",
    descrizione: "Partecipa al Fanta a 20 per una stagione.",
    rarita: "Base",
  },
  due_anni: {
    titolo: "Due stagioni",
    descrizione: "Partecipa al Fanta a 20 per due stagioni.",
    rarita: "Base",
  },
  tre_anni: {
    titolo: "Tre stagioni",
    descrizione: "Partecipa al Fanta a 20 per tre stagioni.",
    rarita: "Comune",
  },
  promozione: {
    titolo: "Promozione",
    descrizione: "Vieni promosso almeno una volta.",
    rarita: "Comune",
  },
  retrocessione: {
    titolo: "Retrocessione",
    descrizione: "Retrocedi almeno una volta.",
    rarita: "Base",
  },
  triplete: {
    titolo: "Triplete",
    descrizione:
      "Conquista campionato, Champions League e Coppa Fanta a 20 nella stessa stagione.",
    rarita: "Leggendario",
  },
  ventesimo: {
    titolo: "Fanalino di coda",
    descrizione: "Concludi un campionato al 20° posto.",
    rarita: "Base",
  },
  vinci_champions: {
    titolo: "Campione Champions League",
    descrizione: "Conquista la Champions League almeno una volta.",
    rarita: "Raro",
  },
  vinci_conference: {
    titolo: "Campione Conference League",
    descrizione: "Conquista la Conference League almeno una volta.",
    rarita: "Comune",
  },
  vinci_coppa_fanta_a_20: {
    titolo: "Campione Coppa Fanta a 20",
    descrizione: "Conquista la Coppa Fanta a 20 almeno una volta.",
    rarita: "Leggendario",
  },
  vinci_europa: {
    titolo: "Campione Europa League",
    descrizione: "Conquista l’Europa League almeno una volta.",
    rarita: "Comune",
  },
  vinci_serie_a: {
    titolo: "Campione Serie A",
    descrizione: "Vinci il campionato di Serie A.",
    rarita: "Raro",
  },
  vinci_serie_b: {
    titolo: "Campione Serie B",
    descrizione: "Vinci il campionato di Serie B.",
    rarita: "Comune",
  },
  vinci_serie_c: {
    titolo: "Campione Serie C",
    descrizione: "Vinci il proprio girone di Serie C.",
    rarita: "Comune",
  },
  acquisto_piu_costoso: {
    titolo: "Colpo da record",
    descrizione: "Realizza l’acquisto più costoso di sempre.",
    rarita: "Raro",
  },
  miglior_punteggio: {
    titolo: "Punteggio record",
    descrizione: "Ottieni il fantapunteggio più alto di sempre in una giornata.",
    rarita: "Raro",
  },
  peggior_punteggio: {
    titolo: "Giornata da dimenticare",
    descrizione: "Registra il fantapunteggio più basso di sempre in una giornata.",
    rarita: "Raro",
  },
  piu_scambi: {
    titolo: "Re del mercato",
    descrizione: "Effettua il maggior numero di scambi di sempre in una stagione.",
    rarita: "Raro",
  },
};

function getInfoEmblema(chiave: string): EmblemaInfo {
  return (
    infoEmblemi[chiave] ?? {
      titolo: chiave.replace(/_/g, " "),
      descrizione: "Emblema ufficiale conquistato dalla società.",
      rarita: "Base",
    }
  );
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
const emblemi = getEmblemi();
  const team = societa.find((item) => item.slug === slug);

  if (!team) {
    notFound();
  }

  const trofei = palmares.find((item) => item.squadraId === team.id);
  const rosaTeam = rose.filter((item) => item.squadraId === team.id);
  const emblemiTeam = emblemi.find(
  (item) => item.squadraId === team.id
);
  const risultatiTeam = risultati.filter((item) => item.squadraId === team.id);
  const storiaEditoriale = storieSocieta.find(
    (item) => item.squadraId === team.id
  );

  const legaGradient = getLegaGradient(team.legaAttuale);

  const palmaresCards = [
    {
      value: trofei?.campionatiSerieA ?? 0,
      image: "/trofei/scudetto-a.png?v=20260713-1602",
      label: "Serie A",
      style:
        "border-sky-200 bg-gradient-to-br from-sky-200 via-sky-50 to-white shadow-sky-100",
      glow: "drop-shadow-[0_0_26px_rgba(14,165,233,0.85)]",
    },
    {
      value: trofei?.campionatiSerieB ?? 0,
      image: "/trofei/scudetto-b.png?v=20260713-1602",
      label: "Serie B",
      style:
        "border-emerald-200 bg-gradient-to-br from-emerald-200 via-emerald-50 to-white shadow-emerald-100",
      glow: "drop-shadow-[0_0_26px_rgba(16,185,129,0.8)]",
    },
    {
      value: trofei?.campionatiSerieC ?? 0,
      image: "/trofei/scudetto-c.png?v=20260713-1602",
      label: "Serie C",
      style:
        "border-violet-200 bg-gradient-to-br from-violet-200 via-violet-50 to-white shadow-violet-100",
      glow: "drop-shadow-[0_0_26px_rgba(139,92,246,0.8)]",
    },
    {
      value: trofei?.championsLeague ?? 0,
      image: "/trofei/champions-league.png?v=20260713-1602",
      label: "Champions League",
      style:
        "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 shadow-blue-950/30",
      glow: "drop-shadow-[0_0_30px_rgba(147,197,253,0.95)]",
      dark: true,
    },
    {
      value: trofei?.europaLeague ?? 0,
      image: "/trofei/europa-league.png?v=20260713-1602",
      label: "Europa League",
      style:
        "border-orange-400 bg-gradient-to-br from-orange-500 via-orange-300 to-orange-100 shadow-orange-200",
      glow: "drop-shadow-[0_0_30px_rgba(251,146,60,0.95)]",
    },
    {
      value: trofei?.conferenceLeague ?? 0,
      image: "/trofei/conference-league.png?v=20260713-1602",
      label: "Conference League",
      style:
        "border-emerald-900/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 shadow-emerald-950/30",
      glow: "drop-shadow-[0_0_30px_rgba(110,231,183,0.9)]",
      dark: true,
    },
    {
      value: trofei?.coppaFantaA20 ?? 0,
      image: "/trofei/coppa-fanta-a-20.png?v=20260713-1602",
      label: "Coppa Fanta a 20",
      style:
        "border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-100 to-white shadow-amber-200",
      glow: "drop-shadow-[0_0_34px_rgba(251,191,36,1)]",
    },
  ].filter((item) => item.value > 0);
const emblemiSbloccati = emblemiTeam
  ? Object.entries(emblemiTeam.emblemi).filter(
      ([, stato]) => stato === "Sì"
    )
  : [];

const emblemiDaDifendere = emblemiTeam
  ? Object.entries(emblemiTeam.emblemi).filter(
      ([, stato]) => stato === "Difendi"
    )
  : [];
const toEmblemaVisuale = ([chiave]: [string, string]) => ({
  chiave,
  ...getInfoEmblema(chiave),
});
const emblemiSbloccatiVisuali = emblemiSbloccati.map(toEmblemaVisuale);
const emblemiDaDifendereVisuali = emblemiDaDifendere.map(toEmblemaVisuale);
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className={`bg-gradient-to-r ${legaGradient} px-4 py-4 text-white sm:px-8 sm:py-8`}>
            <p className="text-sm uppercase tracking-[0.3em] text-white/80">
              Scheda società
            </p>
          </div>

          <div className="p-4 text-center sm:p-8 lg:p-10">
            <Image
              src={team.logo}
              alt={team.nome}
              width={280}
              height={280}
              className="mx-auto mb-4 max-h-36 w-auto object-contain drop-shadow-sm transition hover:scale-105 hover:drop-shadow-[0_22px_30px_rgba(14,116,144,0.35)] sm:mb-8 sm:max-h-72"
            />

            <h1 className="mb-2 break-words text-2xl font-black text-blue-950 sm:mb-4 sm:text-4xl lg:text-5xl">
              {team.nome}
            </h1>

            <p className="mb-4 text-sm font-semibold text-slate-500 sm:mb-6 sm:text-base">
              {team.legaAttuale}
            </p>

            <Link
              href={`/gioca?societa=${encodeURIComponent(team.slug)}`}
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-950/10 bg-blue-950 px-5 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_rgba(23,37,84,0.16)] transition hover:-translate-y-0.5 hover:bg-blue-900 hover:shadow-[0_14px_32px_rgba(23,37,84,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:mb-8 sm:min-h-11 sm:px-6 sm:text-[10px]"
            >
              Scendi in campo con questa società
              <span aria-hidden="true">→</span>
            </Link>

            <div className="hidden flex-wrap justify-center sm:mb-8 sm:flex sm:gap-3">
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
              <div className="mx-auto mb-9 max-w-4xl rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-white p-4 text-left shadow-md shadow-sky-100/70 sm:p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-sky-600">
                  Identità storica
                </p>

                <div className="mb-4 h-[4px] w-40 rounded-full bg-gradient-to-r from-blue-950 via-sky-500 to-transparent" />

                <p className="break-words text-[15px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
                  {storiaEditoriale.descrizione}
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:gap-4 md:grid-cols-3">
              <Link
                href="/statistiche#ranking"
                className="rounded-2xl bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md sm:p-6"
              >
                <p className="text-sm font-bold text-slate-500">Ranking</p>
                <p className="text-3xl font-black text-blue-950">
                  #{team.ranking}
                </p>
              </Link>

              <Link
                href="#rose"
                className="rounded-2xl bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md sm:p-6"
              >
                <p className="text-sm font-bold text-slate-500">Rose</p>
                <p className="text-2xl font-black text-blue-950">
                  Visualizza
                </p>
              </Link>

              <Link
                href="#storia"
                className="rounded-2xl bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md sm:p-6"
              >
                <p className="text-sm font-bold text-slate-500">Storia</p>
                <p className="text-2xl font-black text-blue-950">
                  Esplora
                </p>
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-3 sm:space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur">
            <div className={`bg-gradient-to-r ${legaGradient} px-5 py-5 text-white sm:px-7`}>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/80">
                Profilo societario
              </p>
            </div>

            <dl className="divide-y divide-slate-100 px-5 sm:px-7">
              {[
                ["Fantallenatore", team.fantallenatore],
                ["Lega attuale", team.legaAttuale],
                ["Presente dal", team.stagioneIngresso],
              ].map(([label, value]) => (
                <div key={label} className="flex min-w-0 items-center justify-between gap-3 py-4 sm:gap-5">
                  <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-sm font-black text-blue-950">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur sm:p-6">
            <div className="mb-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500">
                  Bacheca ufficiale
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-blue-950">
                  Palmarès
                </h2>
              </div>
            </div>

            {palmaresCards.length > 0 ? (
              <PalmaresSocieta items={palmaresCards} />
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Nessun trofeo ancora registrato.
              </p>
            )}
          </div>

          <EmblemiSocieta
            sbloccati={emblemiSbloccatiVisuali}
            daDifendere={emblemiDaDifendereVisuali}
          />
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
