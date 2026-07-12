import Image from "next/image";
import Link from "next/link";
import { getPalmares } from "@/lib/palmares";
import { getSocieta } from "@/lib/societa";

const competizioni = [
  {
    nome: "Coppa Fanta a 20",
    key: "coppaFantaA20",
    image: "/trofei/coppa-fanta-a-20.png",
    colore:
      "border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-100 to-white text-blue-950 shadow-amber-200/70",
    glow: "group-hover/logo:drop-shadow-[0_0_24px_rgba(251,191,36,0.9)]",
  },
  {
    nome: "Champions League",
    key: "championsLeague",
    image: "/trofei/champions-league.png",
    colore:
      "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-blue-950/40",
    glow: "group-hover/logo:drop-shadow-[0_0_24px_rgba(96,165,250,0.85)]",
  },
  {
    nome: "Europa League",
    key: "europaLeague",
    image: "/trofei/europa-league.png",
    colore:
      "border-orange-400 bg-gradient-to-br from-orange-600 via-orange-400 to-orange-100 text-white shadow-orange-300/70",
    glow: "group-hover/logo:drop-shadow-[0_0_24px_rgba(251,146,60,0.95)]",
  },
  {
    nome: "Conference League",
    key: "conferenceLeague",
    image: "/trofei/conference-league.png",
    colore:
      "border-emerald-900/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 text-white shadow-emerald-950/40",
    glow: "group-hover/logo:drop-shadow-[0_0_24px_rgba(52,211,153,0.9)]",
  },
] as const;

export default function AlboDOroCoppe() {
  const palmares = getPalmares();
  const societa = getSocieta();

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-8">
      <div className="mb-10">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-amber-500">
          Archivio storico
        </p>

        <h2 className="text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl md:text-5xl">
          Albo d&apos;oro delle coppe
        </h2>

        <p className="mt-4 max-w-5xl text-lg leading-8 text-slate-600">
          La memoria ufficiale delle competizioni del Fanta a 20: stagione dopo
          stagione, qui sono raccolte le società capaci di alzare un trofeo.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-4">
        {competizioni.map((coppa) => {
          const vincitori = palmares
            .filter((item) => item[coppa.key] > 0)
            .map((item) => {
              const societaInfo = societa.find(
                (squadra) => squadra.id === item.squadraId
              );

              return {
                ...item,
                societa: societaInfo,
              };
            })
            .filter((item) => item.societa && item.societa.logo);

          return (
            <article
              key={coppa.nome}
              className={`group relative min-h-0 overflow-hidden rounded-[2rem] border p-4 shadow-xl transition duration-300 hover:-translate-y-1 sm:min-h-[355px] sm:p-6 ${coppa.colore}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_44%)]" />
              <div className="pointer-events-none absolute inset-x-8 top-24 h-28 rounded-full bg-white/10 blur-2xl transition duration-500 group-hover:bg-white/18" />

              <div className="relative z-10 flex min-h-0 flex-col sm:min-h-[307px]">
                <div className="text-center">
                  <h3 className="text-lg font-black uppercase tracking-tight sm:text-xl">
                    {coppa.nome}
                  </h3>

                  <div className="mt-2 flex h-20 items-center justify-center sm:mt-5 sm:h-28">
                    <Image
                      src={coppa.image}
                      alt={coppa.nome}
                      width={170}
                      height={170}
                      className="h-auto max-h-28 w-auto object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.45)] transition duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_46px_rgba(255,255,255,0.65)]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex min-h-0 flex-wrap items-end justify-center gap-3 pb-1 sm:mt-auto sm:min-h-[92px] sm:gap-5">
                  {vincitori.map((vincitore) => (
                    <Link
                      key={vincitore.squadraId}
                      href={`/societa/${vincitore.societa!.slug}`}
                      title={vincitore.societa!.nome}
                      className="group/logo flex flex-col items-center gap-1.5"
                    >
                      <Image
                        src={vincitore.societa!.logo}
                        alt={vincitore.societa!.nome}
                        width={58}
                        height={58}
                        className={`h-14 w-14 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)] transition duration-300 group-hover/logo:-translate-y-1 group-hover/logo:scale-115 ${coppa.glow}`}
                      />

                      <span className="text-xs font-black uppercase tracking-[0.14em] drop-shadow">
                        x{vincitore[coppa.key]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
