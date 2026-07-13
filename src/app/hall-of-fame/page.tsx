import Image from "next/image";
import Link from "next/link";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";
import PageHeader from "../components/PageHeader";
import { getRisultati } from "@/lib/risultati";
import { redirect } from "next/navigation";

const sezioni = [
  {
    titolo: "GLI SCUDETTI",
    descrizione: "Le società che hanno conquistato i campionati nazionali.",
    gruppi: [
      {
        label: "Serie A",
        campo: "campionatiSerieA",
        icona: "/trofei/scudetto-a.png?v=20260713-1602",
        style: "border-sky-400/60 bg-gradient-to-br from-sky-600 via-sky-400 to-sky-100 text-white shadow-sky-300/50 darkCard",
      },
      {
        label: "Serie B",
        campo: "campionatiSerieB",
        icona: "/trofei/scudetto-b.png?v=20260713-1602",
        style: "border-emerald-400/50 bg-gradient-to-br from-emerald-950 via-emerald-700 to-emerald-300 text-white shadow-emerald-400/35 darkCard",
      },
      {
        label: "Serie C",
        campo: "campionatiSerieC",
        icona: "/trofei/scudetto-c.png?v=20260713-1602",
        style: "border-violet-400/50 bg-gradient-to-br from-violet-950 via-violet-700 to-violet-300 text-white shadow-violet-400/35 darkCard",
      },
    ],
  },
  {
    titolo: "LE COPPE EUROPEE",
    descrizione: "Le società che hanno lasciato il segno nelle competizioni europee.",
    gruppi: [
      {
        label: "Champions League",
        campo: "championsLeague",
        icona: "/trofei/champions-league.png?v=20260713-1602",
        style: "border-blue-900/20 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-blue-950/30 darkCard",
      },
      {
        label: "Europa League",
        campo: "europaLeague",
        icona: "/trofei/europa-league.png?v=20260713-1602",
        style: "border-orange-500/40 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-200 text-white shadow-orange-400/40 darkCard",
      },
      {
        label: "Conference League",
        campo: "conferenceLeague",
        icona: "/trofei/conference-league.png?v=20260713-1602",
        style: "border-emerald-800/30 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white shadow-emerald-950/30 darkCard",
      },
    ],
  },
  {
    titolo: "LA COPPA FANTA A 20",
    descrizione: "La coppa più prestigiosa e difficile dell’intero ecosistema competitivo.",
    gruppi: [
      {
        label: "Coppa Fanta a 20",
        campo: "coppaFantaA20",
        icona: "/trofei/coppa-fanta-a-20.png?v=20260713-1602",
        style: "border-amber-300 bg-gradient-to-br from-white via-amber-50 to-yellow-100 shadow-amber-200/70",
      },
    ],
  },
];

function valore(record: unknown, campo: string) {
  const item = record as Record<string, unknown>;
  return Number(item[campo] ?? 0);
}

function trofeoGlow(image: string) {
  if (image.includes("scudetto-a")) return "drop-shadow-[0_0_24px_rgba(251,191,36,0.52)]";
  if (image.includes("scudetto-b")) return "drop-shadow-[0_0_24px_rgba(52,211,153,0.5)]";
  if (image.includes("scudetto-c")) return "drop-shadow-[0_0_24px_rgba(167,139,250,0.58)]";
  if (image.includes("champions")) return "drop-shadow-[0_0_28px_rgba(147,197,253,0.62)]";
  if (image.includes("europa")) return "drop-shadow-[0_0_26px_rgba(251,146,60,0.5)]";
  if (image.includes("conference")) return "drop-shadow-[0_0_26px_rgba(52,211,153,0.48)]";
  return "drop-shadow-[0_0_30px_rgba(251,191,36,0.68)]";
}

function trofeoArchivioSize(image: string) {
  if (image.includes("scudetto")) return "max-h-28 max-w-32 sm:max-h-36 sm:max-w-40";
  if (image.includes("champions")) return "max-h-32 max-w-36 sm:max-h-40 sm:max-w-44";
  return "max-h-32 max-w-32 sm:max-h-40 sm:max-w-36";
}

export function HallOfFameContent({ embedded = false }: { embedded?: boolean }) {
  const societa = getSocieta();
  const palmares = getPalmares();
  const risultati = getRisultati();

  const vincitoriCoppaFanta = risultati
    .filter(
      (item) =>
        item.competizione === "Coppa Fanta a 20" &&
        item.risultatoTesto.toLowerCase() === "vincitore"
    )
    .map((item) => ({
      stagione: item.stagione,
      team: societa.find((team) => team.id === item.squadraId),
    }))
    .filter((item) => item.team)
    .sort((a, b) => a.stagione.localeCompare(b.stagione));

  const societaPiuTitolata = [...palmares].sort(
    (a, b) => b.totaleTrofei - a.totaleTrofei
  )[0];

  const teamPiuTitolato = societa.find(
    (team) => team.id === societaPiuTitolata?.squadraId
  );

  const trofeiPiuTitolata = societaPiuTitolata
    ? [
        { label: "Serie A", count: societaPiuTitolata.campionatiSerieA, image: "/trofei/scudetto-a.png?v=20260713-1602" },
        { label: "Serie B", count: societaPiuTitolata.campionatiSerieB, image: "/trofei/scudetto-b.png?v=20260713-1602" },
        { label: "Serie C", count: societaPiuTitolata.campionatiSerieC, image: "/trofei/scudetto-c.png?v=20260713-1602" },
        { label: "Champions League", count: societaPiuTitolata.championsLeague, image: "/trofei/champions-league.png?v=20260713-1602" },
        { label: "Europa League", count: societaPiuTitolata.europaLeague, image: "/trofei/europa-league.png?v=20260713-1602" },
        { label: "Conference League", count: societaPiuTitolata.conferenceLeague, image: "/trofei/conference-league.png?v=20260713-1602" },
        { label: "Coppa Fanta a 20", count: societaPiuTitolata.coppaFantaA20, image: "/trofei/coppa-fanta-a-20.png?v=20260713-1602" },
      ].filter((trofeo) => trofeo.count > 0)
    : [];

  return (
    <section id="hall-of-fame" className={embedded ? "scroll-mt-28" : "mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16"}>
      {!embedded && <PageHeader
        eyebrow="Trofei e memoria storica"
        title="Hall of Fame"
        description="La vetrina più prestigiosa del Fanta a 20, dove trofei, vittorie e società leggendarie compongono la storia della competizione."
      />}

      {teamPiuTitolato && societaPiuTitolata && (
        <article
          className={`relative overflow-hidden rounded-[2rem] border border-amber-300/45 bg-[linear-gradient(145deg,#071f45_0%,#102f64_58%,#162744_100%)] text-white shadow-2xl shadow-blue-950/25 ${embedded ? "mb-7" : "mb-9"}`}
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-300/15 blur-[85px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-sky-400/15 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_38%)]" />

          <div className={`relative grid grid-cols-[minmax(0,1fr)_82px] items-center gap-4 px-4 pb-4 pt-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:px-7 sm:pb-6 sm:pt-7 ${embedded ? "lg:grid-cols-[1fr_230px] lg:px-9 lg:pt-9" : "lg:grid-cols-[1fr_290px] lg:px-10 lg:pt-10"}`}>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300 sm:text-xs sm:tracking-[0.3em]">La società più titolata</p>
              <h2 className={`mt-2 break-words font-black uppercase leading-[0.95] tracking-[-0.035em] ${embedded ? "text-2xl sm:text-4xl lg:text-5xl" : "text-3xl sm:text-5xl lg:text-6xl"}`}>{teamPiuTitolato.nome}</h2>
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/55 sm:mt-4 sm:text-base sm:leading-7">La società che ha vinto più trofei nella storia del Fanta a 20.</p>

              <div className="mt-4 flex items-end gap-2 sm:mt-6 sm:gap-3">
                <span className="text-5xl font-black leading-none text-amber-300 sm:text-7xl">{societaPiuTitolata.totaleTrofei}</span>
                <span className="pb-1 text-[9px] font-black uppercase leading-4 tracking-[0.16em] text-white/50 sm:pb-2 sm:text-xs sm:leading-5 sm:tracking-[0.2em]">Trofei<br />ufficiali</span>
              </div>
            </div>

            <Link href={`/societa/${teamPiuTitolato.slug}`} aria-label={`Apri la scheda di ${teamPiuTitolato.nome}`} className="group/logo relative flex items-center justify-center self-stretch rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              <div className="pointer-events-none absolute h-20 w-20 rounded-full bg-white/10 blur-2xl sm:h-40 sm:w-40" />
              <Image src={teamPiuTitolato.logo} alt={teamPiuTitolato.nome} width={300} height={300} className="relative max-h-20 w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.4)] transition duration-500 group-hover/logo:scale-105 sm:max-h-44 lg:max-h-56" />
            </Link>
          </div>

          <div className="relative border-t border-white/10 bg-black/10 px-4 py-4 sm:px-7 sm:py-6 lg:px-9">
            <div className="mb-3 flex items-center justify-between gap-4 sm:mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45 sm:text-[10px] sm:tracking-[0.24em]">La bacheca dei trofei</p>
            </div>

            <div className="grid grid-cols-3 items-end gap-x-3 gap-y-5 sm:gap-x-8">
              {trofeiPiuTitolata.map((trofeo) => (
                <div key={trofeo.label} className="group/trofeo flex min-w-0 flex-col items-center" title={`${trofeo.label} x${trofeo.count}`}>
                  <div className="flex h-24 w-full items-end justify-center sm:h-32">
                    <Image unoptimized src={trofeo.image} alt={trofeo.label} width={128} height={128} className={`h-[88px] w-[88px] object-contain sm:h-32 sm:w-32 ${trofeoGlow(trofeo.image)} transition duration-500 group-hover/trofeo:-translate-y-1 group-hover/trofeo:scale-105`} />
                  </div>
                  <p className="mt-2 flex h-8 items-start text-center text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-white/65 sm:text-[10px]">{trofeo.label}</p>
                  <p className="mt-0.5 text-sm font-black text-amber-300">x{trofeo.count}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      <div className="grid gap-3 sm:gap-5">
        {[sezioni[0], sezioni[2], sezioni[1]].map((sezione) => (
          <section
            key={sezione.titolo}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/70 sm:p-7"
          >
            <div className="mb-4 sm:mb-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Archivio storico
              </p>

              <h2 className="mt-2 text-2xl font-black text-blue-950 sm:text-3xl">
                {sezione.titolo}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {sezione.descrizione}
              </p>
            </div>

            <div className={`grid gap-4 ${sezione.gruppi.length > 1 ? "lg:grid-cols-3" : ""}`}>
              {sezione.gruppi.map((gruppo) => {
                const records = palmares
                  .map((record) => ({
                    record,
                    team: societa.find((item) => item.id === record.squadraId),
                    count: valore(record, gruppo.campo),
                  }))
                  .filter((item) => item.team && item.count > 0)
                  .sort((a, b) => b.count - a.count);

                const isDark = gruppo.style.includes("darkCard");
                const isCoppaFanta = gruppo.campo === "coppaFantaA20";

                if (isCoppaFanta) {
                  return (
                    <div key={gruppo.label} className={`rounded-[1.75rem] border p-3 shadow-xl sm:p-5 ${gruppo.style.replace(" darkCard", "")}`}>
                      <div className="mb-6 grid grid-cols-[104px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[144px_minmax(0,1fr)] sm:gap-6">
                        <div className="relative flex h-28 w-24 shrink-0 items-center justify-center sm:h-36 sm:w-36">
                          <div className="pointer-events-none absolute h-20 w-20 rounded-full bg-amber-300/55 blur-2xl sm:h-28 sm:w-28" />
                          <div className="pointer-events-none absolute h-16 w-16 rounded-full bg-blue-950/10 blur-xl sm:h-20 sm:w-20" />
                          <Image unoptimized src={gruppo.icona} alt={gruppo.label} width={150} height={150} className={`relative max-h-28 max-w-24 object-contain sm:max-h-36 sm:max-w-32 ${trofeoGlow(gruppo.icona)}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-blue-950">{gruppo.label}</h3>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Vincitori per edizione</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {vincitoriCoppaFanta.length > 0 ? vincitoriCoppaFanta.map(({ stagione, team }) => (
                          <Link key={`${stagione}-${team!.id}`} href={`/societa/${team!.slug}`} className="group grid grid-cols-[72px_52px_minmax(0,1fr)] items-center gap-3 rounded-[1.4rem] border border-amber-200 bg-white/75 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:grid-cols-[90px_64px_minmax(0,1fr)] sm:gap-4 sm:p-4">
                            <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Edizione</p><p className="mt-1 text-lg font-black text-blue-950">{stagione}</p></div>
                            <div className="flex h-14 w-14 items-center justify-center"><Image src={team!.logo} alt={team!.nome} width={58} height={58} className="max-h-14 max-w-14 object-contain transition group-hover:scale-105" /></div>
                            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Campione</p><p className="mt-1 truncate text-xs font-black uppercase text-blue-950 sm:text-base">{team!.nome}</p></div>
                          </Link>
                        )) : <p className="rounded-2xl bg-white/70 p-4 text-sm font-semibold text-slate-500">Nessun vincitore registrato.</p>}
                      </div>
                    </div>
                  );
                }

                return (
                  <article key={gruppo.label} className={`group relative min-h-0 overflow-hidden rounded-[1.75rem] border p-4 shadow-xl transition duration-300 hover:-translate-y-1 sm:min-h-[390px] sm:p-6 ${gruppo.style.replace(" darkCard", "")}`}>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_44%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-24 h-28 rounded-full bg-white/10 blur-2xl transition duration-500 group-hover:bg-white/18" />
                    <div className="relative z-10 flex min-h-0 flex-col sm:min-h-[342px]">
                      <div className="text-center">
                        <h3 className={`text-lg font-black uppercase tracking-tight sm:text-xl ${isDark ? "text-white" : "text-blue-950"}`}>{gruppo.label}</h3>
                        <div className="mt-2 flex h-32 items-center justify-center sm:mt-4 sm:h-44">
                          <Image unoptimized src={gruppo.icona} alt={gruppo.label} width={220} height={220} className={`${trofeoArchivioSize(gruppo.icona)} ${trofeoGlow(gruppo.icona)} h-auto w-auto object-contain transition duration-500 group-hover:scale-105`} />
                        </div>
                      </div>

                      <div className="mt-3 flex min-h-0 flex-wrap items-end justify-center gap-3 pb-1 sm:mt-auto sm:min-h-[92px] sm:gap-5">
                        {records.length > 0 ? records.map(({ team, count }) => (
                          <Link key={team!.id} href={`/societa/${team!.slug}`} title={`${team!.nome} x${count}`} className="group/logo flex flex-col items-center gap-1.5">
                            <Image src={team!.logo} alt={team!.nome} width={58} height={58} className="h-14 w-14 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)] transition duration-300 group-hover/logo:-translate-y-1 group-hover/logo:scale-110" />
                            <span className={`text-xs font-black uppercase tracking-[0.14em] drop-shadow ${isDark ? "text-white" : "text-blue-950"}`}>x{count}</span>
                          </Link>
                        )) : <p className={`text-sm font-semibold ${isDark ? "text-white/60" : "text-slate-500"}`}>Nessun vincitore registrato.</p>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default function HallOfFamePage() {
  redirect("/statistiche#hall-of-fame");
}
