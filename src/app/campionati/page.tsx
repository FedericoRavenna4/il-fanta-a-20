import Image from "next/image";
import Link from "next/link";
import { getSocieta } from "@/lib/societa";
import PageHeader from "../components/PageHeader";

const leghe = [
  {
    id: "serie-a",
    nome: "Serie A",
    logo: "/leghe/serie-a.png",
    colore: "from-sky-500 via-sky-600 to-blue-950",
    descrizione:
      "Il massimo campionato del Fanta a 20, dove competono le società più affermate del sistema.",
  },
  {
    id: "serie-b",
    nome: "Serie B",
    logo: "/leghe/serie-b.png",
    colore: "from-emerald-500 via-emerald-600 to-blue-950",
    descrizione:
      "La lega di passaggio verso l’élite, tra società ambiziose, neopromosse e club in cerca di risalita.",
  },
];

const gironiSerieC = [
  { id: "serie-c-girone-a", nome: "Serie C - Girone A", label: "Girone A" },
  { id: "serie-c-girone-b", nome: "Serie C - Girone B", label: "Girone B" },
  { id: "serie-c-girone-c", nome: "Serie C - Girone C", label: "Girone C" },
];

export function CampionatiContent({ embedded = false }: { embedded?: boolean }) {
  const societa = getSocieta();

  const campioneSerieA = societa.find((team) => team.badgeCampioneSerieA);

  const neopromosseSerieA = societa.filter(
    (team) => team.legaAttuale === "Serie A" && team.badgeNeopromossa
  );

  const neopromosseSerieB = societa.filter(
    (team) => team.legaAttuale === "Serie B" && team.badgeNeopromossa
  );

  return (
    <section id="campionati" className={embedded ? "scroll-mt-28" : "mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16"}>
      {!embedded && <PageHeader
        eyebrow="Sistema competitivo"
        title="Campionati"
        description="Dalla Serie A ai tre gironi di Serie C, cinque leghe unite da promozioni, retrocessioni e una corsa continua verso il vertice."
      />}

      <div className="grid gap-5 sm:gap-8">
        {leghe.map((lega) => {
          const hoverClass =
  lega.nome === "Serie A"
    ? "hover:bg-sky-500 hover:ring-sky-300"
    : "hover:bg-emerald-500 hover:ring-emerald-300";
          const squadreLega = societa.filter(
            (team) => team.legaAttuale === lega.nome
          );

          const neopromosse =
            lega.nome === "Serie A" ? neopromosseSerieA : neopromosseSerieB;

          return (
            <section
              key={lega.id}
              id={lega.id}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
            >
              <div className={`bg-gradient-to-r ${lega.colore} px-4 py-4 text-white sm:px-8 sm:py-8`}>
                <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-x-3 gap-y-2 sm:flex sm:flex-col sm:gap-8 md:flex-row md:items-center md:justify-between">
                  <div className="contents sm:block">
                    <p className="order-1 col-span-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/60 sm:text-xs sm:tracking-[0.35em]">
                      Campionato
                    </p>

                    <h2 className="order-2 mt-0 text-3xl font-black tracking-tight drop-shadow-sm sm:mt-2 sm:text-4xl lg:text-5xl">
  {lega.nome}
</h2>

                    <p className="order-4 col-span-2 mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/85 sm:mt-4 sm:text-base sm:leading-7">
                      {lega.descrizione}
                    </p>
                  </div>

                  <div className="order-3 flex h-16 w-16 items-center justify-center p-1 sm:h-44 sm:w-44 sm:p-2">
                    <Image
                      src={lega.logo}
                      alt={`Logo ${lega.nome}`}
                      width={180}
                      height={180}
                      className="max-h-40 w-auto object-contain drop-shadow-[0_18px_28px_rgba(255,255,255,0.45)]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1fr_1.3fr]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-6">
                  {lega.nome === "Serie A" && campioneSerieA ? (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">
                        Campione in carica
                      </p>

                      <Link
                        href={`/societa/${campioneSerieA.slug}`}
                        className="mt-5 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Image
                          src={campioneSerieA.logo}
                          alt={campioneSerieA.nome}
                          width={76}
                          height={76}
                          className="max-h-16 w-auto object-contain"
                        />

                        <div>
                          <h3 className="font-black uppercase text-blue-950">
                            {campioneSerieA.nome}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Detentrice del titolo di Serie A
                          </p>
                        </div>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Il cuore della piramide
                      </p>

                      <h3 className="mt-3 text-2xl font-black text-blue-950">
                        La lega degli equilibri
                      </h3>

                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        Ambizione, continuità e pressione si incontrano nella
                        categoria che separa la crescita dalla consacrazione.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Neopromosse
                  </p>

                  {neopromosse.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {neopromosse.map((team) => (
                        <Link
                          key={team.id}
                          href={`/societa/${team.slug}`}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                        >
                          <Image
                            src={team.logo}
                            alt={team.nome}
                            width={54}
                            height={54}
                            className="max-h-12 w-auto object-contain"
                          />

                          <div className="min-w-0">
                            <p className="truncate font-black uppercase text-blue-950">
                              {team.nome}
                            </p>

                            <p className="text-xs font-bold text-emerald-600">
                              ⬆️ Neopromossa
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                      Le neopromosse verranno evidenziate qui quando presenti
                      nei dati società.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 px-4 pb-4 sm:px-6 sm:pb-7">
                <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Società partecipanti
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2 sm:mt-5 sm:grid-cols-5 sm:gap-3 md:grid-cols-8 lg:grid-cols-10">
                  {squadreLega.map((team) => (
                    <Link
  key={team.id}
  href={`/societa/${team.slug}`}
  title={team.nome}
  aria-label={team.nome}
  className={`group relative flex h-16 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100 transition hover:-translate-y-1 hover:scale-[1.03] hover:shadow-lg sm:h-28 sm:rounded-2xl sm:p-3 ${hoverClass}`}
>
  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-br from-white/35 via-white/10 to-transparent transition duration-500 group-hover:translate-x-0" />

  <Image
    src={team.logo}
    alt={team.nome}
    width={64}
    height={64}
    className="relative z-10 max-h-11 max-w-11 object-contain transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(255,255,255,0.95)] sm:max-h-14 sm:max-w-14 sm:group-hover:-translate-y-5"
  />

  <div className="pointer-events-none absolute bottom-2 left-1 right-1 z-10 hidden h-8 items-center justify-center overflow-hidden rounded-lg bg-slate-950/65 px-1 opacity-100 transition duration-300 sm:flex lg:bottom-3 lg:left-2 lg:right-2 lg:h-9 lg:bg-transparent lg:opacity-0 lg:group-hover:opacity-100">
  <p className="line-clamp-2 text-center text-[10px] font-black uppercase leading-tight text-white">
    {team.nome}
  </p>
</div>
</Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section
          id="serie-c"
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
        >
          <div className="bg-gradient-to-r from-violet-500 via-violet-600 to-blue-950 px-4 py-4 text-white sm:px-8 sm:py-8">
            <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-x-3 gap-y-2 sm:flex sm:flex-col sm:gap-8 md:flex-row md:items-center md:justify-between">
              <div className="contents sm:block">
                <p className="order-1 col-span-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/70 sm:text-xs sm:tracking-[0.3em]">
                  Campionato
                </p>

                <h2 className="order-2 mt-0 text-3xl font-black tracking-tight drop-shadow-sm sm:mt-2 sm:text-4xl lg:text-5xl">
  Serie C
</h2>

                <p className="order-4 col-span-2 mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/85 sm:mt-4 sm:text-base sm:leading-7">
                  La base del sistema competitivo, divisa in tre gironi. Qui
                  nascono nuove rivalità e iniziano le scalate verso le leghe
                  superiori.
                </p>
              </div>

              <div className="order-3 flex h-16 w-16 items-center justify-center p-1 sm:h-44 sm:w-44 sm:p-2">
                <Image
                  src="/leghe/serie-c.png"
                  alt="Logo Serie C"
                  width={180}
                  height={180}
                  className="max-h-40 w-auto object-contain drop-shadow-[0_18px_28px_rgba(255,255,255,0.45)]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:gap-5 sm:p-6 md:grid-cols-3">
            {gironiSerieC.map((girone) => {
              const squadreGirone = societa.filter(
                (team) => team.legaAttuale === girone.nome
              );

              return (
                <div
                  key={girone.id}
                  id={girone.id}
                  className="rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-3 shadow-sm sm:p-5"
                >
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-600">
                    Serie C
                  </p>

                  <h3 className="mt-1 text-lg font-black text-blue-950 sm:mt-2 sm:text-2xl">
                    {girone.label}
                  </h3>

                  <div className="mt-3 grid grid-cols-5 gap-1.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
                    {squadreGirone.map((team) => (
                      <Link
  key={team.id}
  href={`/societa/${team.slug}`}
  title={team.nome}
  aria-label={team.nome}
  className="group relative flex h-14 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-violet-100 transition hover:-translate-y-1 hover:scale-[1.03] hover:bg-violet-500 hover:shadow-lg hover:ring-violet-300 sm:h-24 sm:rounded-2xl sm:p-2"
>
  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-br from-white/35 via-white/10 to-transparent transition duration-500 group-hover:translate-x-0" />

  <Image
    src={team.logo}
    alt={team.nome}
    width={52}
    height={52}
    className="relative z-10 max-h-9 max-w-9 object-contain transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(255,255,255,0.95)] sm:max-h-12 sm:max-w-12 sm:group-hover:-translate-y-5"
  />

  <div className="pointer-events-none absolute bottom-2 left-1 right-1 z-10 hidden h-8 items-center justify-center overflow-hidden rounded-lg bg-slate-950/65 px-1 opacity-100 transition duration-300 sm:flex lg:bottom-3 lg:left-1.5 lg:right-1.5 lg:h-9 lg:bg-transparent lg:opacity-0 lg:group-hover:opacity-100">
  <p className="overflow-hidden text-ellipsis text-center text-[9px] font-black uppercase leading-tight text-white">
  {team.nome}
</p>
</div>
</Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

export default function CampionatiPage() {
  return <CampionatiContent />;
}
