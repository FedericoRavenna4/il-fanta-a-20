import Image from "next/image";
import Link from "next/link";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";
import PageHeader from "../components/PageHeader";
import { getRisultati } from "@/lib/risultati";

const sezioni = [
  {
    titolo: "Gli Scudetti",
    descrizione: "Le società che hanno conquistato i campionati nazionali.",
    gruppi: [
      {
        label: "Serie A",
        campo: "campionati",
        icona: "/trofei/scudetto-a.png",
        style: "border-sky-200 bg-gradient-to-br from-sky-100 via-white to-white shadow-sky-100",
      },
      {
        label: "Serie B",
        campo: "campionatiSerieB",
        icona: "/trofei/scudetto-b.png",
        style: "border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-white shadow-emerald-100",
      },
      {
        label: "Serie C",
        campo: "campionatiSerieC",
        icona: "/trofei/scudetto-c.png",
        style: "border-violet-200 bg-gradient-to-br from-violet-100 via-white to-white shadow-violet-100",
      },
    ],
  },
  {
    titolo: "Le Coppe europee",
    descrizione: "Le società che hanno lasciato il segno nelle competizioni europee.",
    gruppi: [
      {
        label: "Champions League",
        campo: "championsLeague",
        icona: "/trofei/champions-league.png",
        style: "border-blue-900/20 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-blue-950/30 darkCard",
      },
      {
        label: "Europa League",
        campo: "europaLeague",
        icona: "/trofei/europa-league.png",
        style: "border-orange-500/40 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-200 text-white shadow-orange-400/40 darkCard",
      },
      {
        label: "Conference League",
        campo: "conferenceLeague",
        icona: "/trofei/conference-league.png",
        style: "border-emerald-800/30 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white shadow-emerald-950/30 darkCard",
      },
    ],
  },
  {
    titolo: "La Coppa Fanta a 20",
    descrizione: "La coppa più prestigiosa e difficile dell’intero ecosistema competitivo.",
    gruppi: [
      {
        label: "Coppa Fanta a 20",
        campo: "coppaFantaA20",
        icona: "/trofei/coppa-fanta-a-20.png",
        style: "border-amber-400 bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-50 shadow-amber-200",
      },
    ],
  },
];

function valore(record: unknown, campo: string) {
  const item = record as Record<string, unknown>;
  return Number(item[campo] ?? 0);
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

  return (
    <section id="hall-of-fame" className={embedded ? "scroll-mt-28" : "mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16"}>
      {!embedded && <PageHeader
        eyebrow="Trofei e memoria storica"
        title="Hall of Fame"
        description="La vetrina più prestigiosa del Fanta a 20, dove trofei, vittorie e società leggendarie compongono la storia della competizione."
      />}

      {teamPiuTitolato && societaPiuTitolata && (
        <Link
          href={`/societa/${teamPiuTitolato.slug}`}
          className={`group block overflow-hidden rounded-[2rem] border border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-50 text-blue-950 shadow-xl shadow-amber-200/60 transition hover:-translate-y-1 ${embedded ? "mb-7" : "mb-9"}`}
        >
          <div className={`grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3 p-4 sm:grid-cols-1 sm:gap-6 sm:p-7 ${embedded ? "lg:grid-cols-[1fr_220px]" : "lg:grid-cols-[1fr_280px] lg:p-8"}`}>
            <div className="contents sm:block">
              <p className="order-1 col-span-2 mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
                🏛️ Società più titolata
              </p>

              <h2 className={`order-2 max-w-4xl break-words font-black leading-tight ${embedded ? "text-xl sm:text-3xl md:text-4xl" : "text-2xl sm:text-4xl md:text-5xl"}`}>
                {teamPiuTitolato.nome}
              </h2>

              <p className="order-4 col-span-2 mt-1 max-w-3xl text-xs font-semibold leading-5 text-amber-900 sm:mt-4 sm:text-base sm:leading-7">
                La società con il maggior numero complessivo di trofei nella
                storia del Fanta a 20.
              </p>

              <div className="order-5 col-span-2 mt-3 grid w-full min-w-0 grid-cols-[minmax(0,0.8fr)_1px_minmax(0,1.2fr)] items-center gap-3 rounded-[1.5rem] border border-amber-300 bg-white/70 px-3 py-2 shadow-md shadow-amber-200/50 sm:mt-5 sm:inline-flex sm:w-auto sm:gap-5 sm:px-5 sm:py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-800">
                    Trofei totali
                  </p>

                  <p className="mt-1 text-3xl font-black leading-none text-blue-950 sm:text-5xl">
                    {societaPiuTitolata.totaleTrofei}
                  </p>
                </div>

                <div className="h-12 w-px bg-amber-300 sm:h-14" />

                <p className="min-w-0 text-xs font-bold leading-5 text-slate-600 sm:max-w-[180px] sm:text-sm">
                  record assoluto nella storia della lega
                </p>
              </div>

              <p className="order-6 col-span-2 mt-3 text-xs font-black text-blue-950 opacity-0 transition group-hover:opacity-100 sm:mt-6 sm:text-sm">
                Vai alla scheda →
              </p>
            </div>

            <div className="order-3 flex items-center justify-center p-0 sm:p-4">
              <Image
                src={teamPiuTitolato.logo}
                alt={teamPiuTitolato.nome}
                width={300}
                height={300}
                className="max-h-18 w-auto object-contain drop-shadow-[0_18px_28px_rgba(30,41,59,0.35)] transition group-hover:scale-105 sm:max-h-72"
              />
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-3 sm:gap-5">
        {[sezioni[0], sezioni[2], sezioni[1]].map((sezione) => (
          <section
            key={sezione.titolo}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/70 sm:p-7"
          >
            <div className="mb-4 sm:mb-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Albo d’oro
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

                return (
                  <div
                    key={gruppo.label}
                    className={`rounded-[1.75rem] border p-3 shadow-xl sm:p-5 ${gruppo.style.replace(" darkCard", "")}`}
                  >
                    <div className="mb-5 flex items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                        <Image
                          src={gruppo.icona}
                          alt={gruppo.label}
                          width={76}
                          height={76}
                          className="max-h-16 w-auto object-contain drop-shadow-lg"
                        />
                      </div>

                      <div>
                        <h3
                          className={`text-xl font-black ${
                            isDark ? "text-white" : "text-blue-950"
                          }`}
                        >
                          {gruppo.label}
                        </h3>

                        <p
                          className={`text-xs font-bold uppercase tracking-wide ${
                            isDark ? "text-white/55" : "text-slate-400"
                          }`}
                        >
                          Vincitori
                        </p>
                      </div>
                    </div>

                    <div className={isCoppaFanta ? "grid gap-3 md:grid-cols-2" : "space-y-3"}>
                      {isCoppaFanta && vincitoriCoppaFanta.length > 0 ? (
                        vincitoriCoppaFanta.map(({ stagione, team }) => (
                          <Link
                            key={`${stagione}-${team!.id}`}
                            href={`/societa/${team!.slug}`}
                            className="group grid grid-cols-[72px_52px_minmax(0,1fr)] items-center gap-3 rounded-[1.4rem] border border-amber-200 bg-white/75 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:grid-cols-[90px_64px_minmax(0,1fr)] sm:gap-4 sm:p-4"
                          >
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">
                                Edizione
                              </p>
                              <p className="mt-1 text-lg font-black text-blue-950">
                                {stagione}
                              </p>
                            </div>
                            <div className="flex h-14 w-14 items-center justify-center">
                              <Image
                                src={team!.logo}
                                alt={team!.nome}
                                width={58}
                                height={58}
                                className="max-h-14 max-w-14 object-contain transition group-hover:scale-105"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Campione
                              </p>
                              <p className="mt-1 truncate font-black uppercase text-blue-950">
                                {team!.nome}
                              </p>
                            </div>
                          </Link>
                        ))
                      ) : records.length > 0 ? (
                        records.map(({ team, count }) => (
                          <Link
                            key={team!.id}
                            href={`/societa/${team!.slug}`}
                            className={`group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
                              isDark
                                ? "bg-white/10 ring-white/10 hover:bg-white/15"
                                : "bg-white/80 ring-white/80 hover:bg-white"
                            }`}
                          >
                            <div className="flex h-12 w-12 items-center justify-center">
                              <Image
                                src={team!.logo}
                                alt={team!.nome}
                                width={52}
                                height={52}
                                className="max-h-11 max-w-11 object-contain transition group-hover:scale-110"
                              />
                            </div>

                            <p
                              className={`truncate font-black uppercase ${
                                isDark ? "text-white" : "text-blue-950"
                              }`}
                            >
                              {team!.nome}
                            </p>

                            <p
                              className={`rounded-full px-3 py-1 text-sm font-black ${
                                isDark
                                  ? "bg-white text-blue-950"
                                  : "bg-blue-950 text-white"
                              }`}
                            >
                              x{count}
                            </p>
                          </Link>
                        ))
                      ) : (
                        <p
                          className={`rounded-2xl p-4 text-sm font-semibold ring-1 ${
                            isDark
                              ? "bg-white/10 text-white/60 ring-white/10"
                              : "bg-white text-slate-400 ring-white/80"
                          }`}
                        >
                          Nessun vincitore registrato.
                        </p>
                      )}
                    </div>
                  </div>
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
  return <HallOfFameContent />;
}
