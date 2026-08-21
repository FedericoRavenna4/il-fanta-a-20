import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getActiveSocietaBySlug } from "@/lib/societa/catalog.server";
import { getPalmares } from "@/lib/palmares";
import { getRanking } from "@/lib/ranking";
import { loadRoseForSocieta } from "@/lib/rose-current.server";
import { getRisultati } from "@/lib/risultati";
import { getStatisticheGiocatori } from "@/lib/statisticheGiocatori";
import RosaSocieta from "./RosaSocieta";
import StoriaSocieta from "./StoriaSocieta";
import { getEmblemiSocieta } from "@/lib/emblemi";
import EmblemiSocieta from "./EmblemiSocieta";
import PalmaresSocieta from "./PalmaresSocieta";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { getActiveSupporters } from "@/lib/account/support.server";
import { getSocietaDefendingEmblems, getSocietaSupportEmblems } from "@/lib/account/support.server";
import TifosiSocieta from "./TifosiSocieta";
import { deriveSocietaSeasonSnapshot } from "@/lib/societa/season-snapshot";
import { loadSocietaSeasonData } from "@/lib/societa/season-data.server";
import StagioneCorrenteSocieta from "./StagioneCorrenteSocieta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await getActiveSocietaBySlug(slug);

  if (!lookup) return {};
  const team = lookup.societa;
  return createPageMetadata({
    title: team.nome,
    description: `Scopri la scheda ufficiale di ${team.nome}: storia, rosa, palmarès, risultati ed emblemi nel Fanta a 20.`,
    path: `/societa/${team.slug}`,
  });
}

function getLegaGradient(lega: string | null) {
  if (lega === "Serie A") return "from-sky-500 via-sky-600 to-blue-900";
  if (lega === "Serie B") return "from-emerald-500 via-emerald-600 to-blue-900";
  if (lega?.startsWith("Serie C")) return "from-violet-500 via-violet-600 to-blue-900";
  return "from-blue-950 via-blue-900 to-blue-800";
}
export default async function SchedaSocietaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookup = await getActiveSocietaBySlug(slug);
  if (!lookup) notFound();
  if (lookup.isAlias) permanentRedirect(`/societa/${lookup.canonicalSlug}`);
  const team = lookup.societa;

  const palmares = getPalmares();
  const ranking = getRanking();
  const risultati = getRisultati();
  const statisticheGiocatori = getStatisticheGiocatori();
  const emblemi = getEmblemiSocieta(new Set(team.badge_tipo === "new_entry" ? [team.id] : []));
  const [supporters, supportEmblems, defendingEmblems, seasonData, rosaTeam] = await Promise.all([
    getActiveSupporters(team.id),
    getSocietaSupportEmblems(team.id),
    getSocietaDefendingEmblems(team.id),
    loadSocietaSeasonData(),
    loadRoseForSocieta(team.id),
  ]);
  const supporterCount = supporters.length;
  const legacySupportEmblemsWithRecords = supportEmblems.map((emblema) =>
    emblema.chiave === "idolo" && emblema.stato === "Da difendere"
      ? { ...emblema, record: String(supporterCount) }
      : emblema
  );
  const dynamicDefendingKeys = new Set(["titano", "abisso", "mecenate", "idolo"]);
  const effectiveSupportEmblems = defendingEmblems === null
    ? legacySupportEmblemsWithRecords
    : [...supportEmblems.filter((emblema) => !dynamicDefendingKeys.has(emblema.chiave)), ...defendingEmblems];
  const seasonSnapshot = deriveSocietaSeasonSnapshot(team.id, seasonData.championships?.leagues ?? [], seasonData.coppa);

  const fantallenatori = (team.fantallenatore ?? "")
    .split(/\s+-\s+/)
    .map((nome) => nome.trim())
    .filter(Boolean);

  const trofei = palmares.find((item) => item.squadraId === team.id);
  const rankingTeam = ranking.find((item) => item.squadraId === team.id);
  const emblemiTeam = emblemi.find(
    (item) => item.squadraId === team.id
  );
  const risultatiTeam = risultati.filter((item) => item.squadraId === team.id);
  const legaCorrente = team.girone
    ? `${team.categoria ?? "Categoria"} - Girone ${team.girone}`
    : team.categoria;
  const legaGradient = getLegaGradient(team.categoria);
  const isNewEntry = team.badge_tipo === "new_entry";
  const isPromoted = team.badge_tipo === "neo_promossa";
  const isChampion = team.badge_tipo === "campione_in_carica";

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
  const legacyEmblems = emblemiTeam?.emblemi.filter(
    (emblema) => defendingEmblems === null || !dynamicDefendingKeys.has(emblema.chiave)
  ) ?? [];
  const emblemiSbloccatiVisuali = [...legacyEmblems.filter(
    (emblema) => emblema.stato === "Sbloccato"
  ), ...effectiveSupportEmblems.filter((emblema) => emblema.stato === "Sbloccato")]
    .filter((emblema, index, all) => all.findIndex((item) => item.id === emblema.id) === index);
  const emblemiDaDifendereVisuali = [...legacyEmblems.filter(
    (emblema) => emblema.stato === "Da difendere"
  ), ...effectiveSupportEmblems.filter((emblema) => emblema.stato === "Da difendere")]
    .filter((emblema, index, all) => all.findIndex((item) => item.id === emblema.id) === index);
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
            <div className="relative mb-4 min-h-36 sm:mb-8 sm:min-h-72">
              <Image
                src={team.logo_path ?? "/logos/logo.png"}
                alt={team.nome}
                width={280}
                height={280}
                className="mx-auto max-h-36 w-auto object-contain drop-shadow-sm transition hover:scale-105 hover:drop-shadow-[0_22px_30px_rgba(14,116,144,0.35)] sm:max-h-72"
              />
              <div className="absolute right-0 top-0 flex max-w-[42%] flex-col items-end gap-1.5 sm:gap-2">
                {isNewEntry && <Image src="/badge-societa/new-entry.png" alt="New entry" width={150} height={55} className="h-12 max-w-full object-contain object-right sm:h-16" />}
                {isPromoted && <Image src="/badge-societa/neo-promossa.png" alt="Neopromossa" width={150} height={55} className="h-12 max-w-full object-contain object-right sm:h-16" />}
                {isChampion && <Image src="/badge-societa/campione-in-carica.png" alt="Campione in carica" width={150} height={55} className="h-12 max-w-full object-contain object-right sm:h-16" />}
              </div>
            </div>

            <h1 className="mb-2 break-words text-2xl font-black text-blue-950 sm:mb-4 sm:text-4xl lg:text-5xl">
              {team.nome}
            </h1>

            <p className="mb-4 text-sm font-semibold text-slate-500 sm:mb-6 sm:text-base">
              {legaCorrente ?? "Categoria non disponibile"}
            </p>

            {team.storia && (
              <div className="mx-auto mb-9 max-w-4xl rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-white p-4 text-left shadow-md shadow-sky-100/70 sm:p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-sky-600">
                  Identità storica
                </p>

                <div className="mb-4 h-[4px] w-40 rounded-full bg-gradient-to-r from-blue-950 via-sky-500 to-transparent" />

                <p className="break-words text-[15px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
                  {team.storia}
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
                  {rankingTeam ? `#${rankingTeam.posizione}` : "—"}
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

              <TifosiSocieta supporters={supporters} />
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
                [fantallenatori.length > 1 ? "Fantallenatori" : "Fantallenatore", team.fantallenatore ?? "—"],
                ["Lega attuale", legaCorrente ?? "—"],
                ["Presente dal", team.stagione_ingresso ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex min-w-0 items-start justify-between gap-3 py-4 sm:items-center sm:gap-5">
                  <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-sm font-black text-blue-950">
                    {label === "Fantallenatori" ? (
                      <span className="flex flex-col items-end">
                        {fantallenatori.map((nome) => <span key={nome}>{nome}</span>)}
                      </span>
                    ) : value}
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

      <StagioneCorrenteSocieta snapshot={seasonSnapshot} />

<span id="rosa" className="block scroll-mt-24" aria-hidden="true" />
<div id="rose">
  <RosaSocieta
    rosa={rosaTeam}
    isNewEntry={isNewEntry}
    statistiche={statisticheGiocatori}
  />
</div>

<div id="storia">
  <StoriaSocieta
    risultati={risultatiTeam}
    nomeSocieta={team.nome}
    squadraId={team.id}
    isNewEntry={isNewEntry}
    descrizioneEditoriale={team.storia ?? undefined}
  />
</div>
    </section>
  );
}
