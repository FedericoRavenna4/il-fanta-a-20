import Image from "next/image";
import Link from "next/link";
import { getSocieta } from "@/lib/societa";
import { getPalmares } from "@/lib/palmares";

const sezioni = [
  {
    titolo: "Campioni d’Italia",
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
    titolo: "Coppe europee",
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
    titolo: "Coppa Fanta a 20",
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

export default function HallOfFamePage() {
  const societa = getSocieta();
  const palmares = getPalmares();

  const societaPiuTitolata = [...palmares].sort(
    (a, b) => b.totaleTrofei - a.totaleTrofei
  )[0];

  const teamPiuTitolato = societa.find(
    (team) => team.id === societaPiuTitolata?.squadraId
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-14">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-slate-400">
          Trofei e memoria storica
        </p>

        <h1 className="mb-5 text-6xl font-black tracking-tight text-blue-950">
          Hall of Fame
        </h1>

        <p className="max-w-6xl text-lg leading-8 text-slate-600">
          La vetrina più prestigiosa del Fanta a 20: il luogo in cui trofei,
          vittorie e società leggendarie compongono la storia della lega.
        </p>
      </div>

      {teamPiuTitolato && societaPiuTitolata && (
        <Link
          href={`/societa/${teamPiuTitolato.slug}`}
          className="group mb-12 block overflow-hidden rounded-[2rem] border border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-50 text-blue-950 shadow-2xl shadow-amber-200/70 transition hover:-translate-y-1"
        >
          <div className="grid items-center gap-8 p-8 lg:grid-cols-[1fr_320px] lg:p-10">
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-amber-800">
                🏛️ Società più titolata
              </p>

              <h2 className="max-w-4xl text-5xl font-black leading-tight md:text-6xl">
                {teamPiuTitolato.nome}
              </h2>

              <p className="mt-4 max-w-3xl font-semibold leading-7 text-amber-900">
                La società con il maggior numero complessivo di trofei nella
                storia del Fanta a 20.
              </p>

              <div className="mt-7 inline-flex items-center gap-5 rounded-[1.5rem] border border-amber-300 bg-white/70 px-5 py-4 shadow-md shadow-amber-200/50">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-800">
                    Trofei totali
                  </p>

                  <p className="mt-1 text-5xl font-black leading-none text-blue-950">
                    {societaPiuTitolata.totaleTrofei}
                  </p>
                </div>

                <div className="h-14 w-px bg-amber-300" />

                <p className="max-w-[180px] text-sm font-bold leading-5 text-slate-600">
                  record assoluto nella storia della lega
                </p>
              </div>

              <p className="mt-6 text-sm font-black text-blue-950 opacity-0 transition group-hover:opacity-100">
                Vai alla scheda →
              </p>
            </div>

            <div className="flex items-center justify-center p-4">
              <Image
                src={teamPiuTitolato.logo}
                alt={teamPiuTitolato.nome}
                width={300}
                height={300}
                className="max-h-72 w-auto object-contain drop-shadow-[0_18px_28px_rgba(30,41,59,0.35)] transition group-hover:scale-105"
              />
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-8">
        {sezioni.map((sezione) => (
          <section
            key={sezione.titolo}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-200/70"
          >
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Albo d’oro
              </p>

              <h2 className="mt-2 text-3xl font-black text-blue-950">
                {sezione.titolo}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {sezione.descrizione}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
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

                return (
                  <div
                    key={gruppo.label}
                    className={`rounded-[1.75rem] border p-5 shadow-xl ${gruppo.style.replace(" darkCard", "")}`}
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

                    <div className="space-y-3">
                      {records.length > 0 ? (
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