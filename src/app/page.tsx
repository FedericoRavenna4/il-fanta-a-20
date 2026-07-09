import Image from "next/image";
import Link from "next/link";
import { getSocieta } from "@/lib/societa";

const vetrinaConfig = [
  {
    id: 1,
    label: "Ranking Leader",
    descrizione: "La società al vertice del ranking storico.",
    colore: "border-red-400 bg-red-500/10 text-red-700",
  },
  {
    id: 2,
    label: "Campione Serie A",
    descrizione: "La squadra campione in carica della massima categoria.",
    colore: "border-sky-300 bg-sky-500/10 text-sky-700",
  },
  {
    id: 42,
    label: "Coppa Fanta a 20",
    descrizione: "Il detentore del trofeo assoluto del Fanta a 20.",
    colore: "border-amber-300 bg-amber-400/15 text-amber-700",
  },
];

const numeri = [
  { value: "100", label: "Società", href: "/societa" },
  { value: "5", label: "Leghe", href: "/campionati" },
  { value: "4", label: "Coppe ufficiali", href: "/coppe" },
  { value: "2023", label: "Anno di nascita", href: "#storia" },
];

const percorsi = [
  {
    label: "Società",
    title: "Le identità del Fanta a 20",
    text: "Tutte le società ufficiali, con loghi, schede, storia e risultati.",
    href: "/societa",
  },
  {
    label: "Campionati",
    title: "La piramide sportiva",
    text: "Serie A, Serie B e Serie C: promozioni, retrocessioni e categorie.",
    href: "/campionati",
  },
  {
    label: "Coppe",
    title: "Il palcoscenico dei trofei",
    text: "Coppa Fanta a 20, Champions, Europa League e Conference League.",
    href: "/coppe",
  },
  {
    label: "Scatto Promozione",
    title: "La novità della Serie C",
    text: "La corsa in stile Formula 1 che assegna la quarta promozione.",
    href: "/scatto-promozione",
  },
  {
    label: "Ranking",
    title: "La classifica storica",
    text: "Il valore delle società misurato stagione dopo stagione.",
    href: "/ranking",
  },
  {
    label: "Regolamento",
    title: "Le regole ufficiali",
    text: "Aste, mercati, campionati, coppe, punteggi e formazione.",
    href: "/regolamento",
  },
];

export default function Home() {
  const societa = getSocieta();

  const squadreVetrina = vetrinaConfig
    .map((item) => {
      const team = societa.find((squadra) => squadra.id === item.id);
      if (!team) return null;

      return {
        ...item,
        nome: team.nome,
        href: `/societa/${team.slug}`,
        logo: team.logo,
      };
    })
    .filter(Boolean);

  return (
    <main className="overflow-hidden bg-[linear-gradient(180deg,#eef7ff_0%,#f8fbff_42%,#eef5fb_100%)]">
      <section className="relative mx-auto max-w-7xl px-6 py-16 text-center sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-blue-200/70 blur-3xl" />

        <Image
          src="/logos/logo.png"
          alt="Logo Il Fanta a 20"
          width={180}
          height={180}
          className="mx-auto mb-8 h-auto w-auto drop-shadow-xl"
          priority
        />

        <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-amber-500">
          Fantacalcio Classic · 100 società · 5 leghe
        </p>

        <h1 className="text-5xl font-black uppercase tracking-tight text-blue-950 md:text-7xl">
          Il Fanta a 20
        </h1>

        <p className="mx-auto mt-6 max-w-4xl text-xl font-semibold leading-9 text-slate-600 md:text-2xl">
          Un fantacalcio trasformato in una competizione permanente: società,
          campionati, coppe, ranking, promozioni e trofei da inseguire stagione
          dopo stagione.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/societa"
            className="rounded-full bg-blue-950 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-1 hover:bg-blue-900"
          >
            Esplora le società
          </Link>

          <Link
            href="/regolamento"
            className="rounded-full border border-blue-950 bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-blue-950 shadow-sm transition hover:-translate-y-1 hover:bg-blue-950 hover:text-white hover:shadow-xl"
          >
            Scopri il regolamento
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-4 md:grid-cols-4">
          {numeri.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-lg shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_40%)] opacity-0 transition duration-300 group-hover:opacity-100" />

              <div className="relative">
                <p className="text-5xl font-black text-blue-950">
                  {item.value}
                </p>

                <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400 transition group-hover:text-amber-500">
                  {item.label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-9 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">
            Dentro il format
          </p>

          <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 md:text-5xl">
            Tutto parte da una società
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Ogni pagina del sito racconta un pezzo del Fanta a 20: identità,
            competizioni, regole, storia e ambizione sportiva.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {percorsi.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">
                  {item.label}
                </p>

                <h3 className="mt-4 text-2xl font-black uppercase tracking-tight text-blue-950">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                  {item.text}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">
              Vetrina
            </p>

            <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
              Società in evidenza
            </h2>
          </div>

          <Link
            href="/societa"
            className="text-sm font-black uppercase tracking-[0.14em] text-blue-950 hover:underline"
          >
            Vedi tutte →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {squadreVetrina.map((squadra) => (
            <Link
              key={squadra.id}
              href={squadra.href}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16),0_0_35px_rgba(251,191,36,0.20)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_58%)] opacity-0 transition duration-300 group-hover:opacity-100" />

              <div
                className={`relative mx-auto inline-flex rounded-full border px-5 py-2 text-xs font-black uppercase tracking-[0.14em] ${squadra.colore}`}
              >
                {squadra.label}
              </div>

              <div className="relative mt-8 flex h-32 items-center justify-center">
                <div className="pointer-events-none absolute h-28 w-28 rounded-full bg-amber-300/0 blur-3xl transition duration-300 group-hover:bg-amber-300/30" />

                <Image
                  src={squadra.logo}
                  alt={`Logo ${squadra.nome}`}
                  width={145}
                  height={145}
                  className="relative max-h-28 max-w-36 object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)] transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_26px_rgba(251,191,36,0.45)]"
                />
              </div>

              <h3 className="mt-7 text-balance text-2xl font-black uppercase leading-tight text-blue-950">
                {squadra.nome}
              </h3>

              <p className="mx-auto mt-4 max-w-xs text-sm font-semibold leading-6 text-slate-500">
                {squadra.descrizione}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="storia"
        className="mx-auto max-w-7xl px-6 py-16"
      >
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-[#142b69] to-slate-950 p-10 text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_38%)]" />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">
                  Identità
                </p>

                <h2 className="mt-3 text-4xl font-black uppercase tracking-tight">
                  Una storia iniziata nel 2023
                </h2>

                <p className="mt-6 text-sm font-semibold leading-7 text-white/70">
                  Il Fanta a 20 nasce come gioco tra amici e diventa stagione
                  dopo stagione una competizione con società, archivi, trofei e
                  memoria sportiva.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-10 text-[17px] leading-8 text-slate-600">
              <p>
                Nato nel 2023, Il Fanta a 20 è cresciuto fino a diventare un
                ecosistema composto da 100 società distribuite su cinque leghe,
                con promozioni, retrocessioni e competizioni ufficiali.
              </p>

              <p>
                Il formato Classic a 20 squadre, senza giocatori duplicati,
                rende ogni scelta tecnica importante e ogni stagione diversa
                dalla precedente.
              </p>

              <p>
                Rose, risultati e classifiche cambiano nel tempo, ma identità,
                palmarès e ranking costruiscono la storia permanente di ogni
                società.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}