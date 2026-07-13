import Image from "next/image";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import RankingSmart from "../ranking/RankingSmart";
import { HallOfFameContent } from "../hall-of-fame/page";
import { getRankingRows } from "@/lib/rankingRows";

const percorsi = [
  {
    eyebrow: "Classifica storica",
    title: "Il Ranking",
    text: "Il valore delle società misurato attraverso risultati, continuità e trofei.",
    href: "#ranking",
    image: "podio",
  },
  {
    eyebrow: "Trofei e memoria",
    title: "L'Hall of Fame",
    text: "I club che hanno conquistato i titoli e scritto le pagine più prestigiose.",
    href: "#hall-of-fame",
    image: "/hall-of-fame/vetrina-trofei.png?v=20260713-1602",
  },
];

export default function StatistichePage() {
  const rows = getRankingRows();

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Numeri e storia"
        title="Le Statistiche"
        description="Ranking e Hall of Fame raccontano il valore, i successi e l’eredità sportiva delle società del Fanta a 20."/>

      <div className="mb-10 grid gap-3 sm:mb-20 sm:gap-5 md:grid-cols-2">
        {percorsi.map((item) => (
          <Link key={item.title} href={item.href} className="group relative min-h-0 overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1 hover:shadow-2xl sm:min-h-64 sm:p-9">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-sky-400/10 blur-[75px]" />
            <div className="relative grid h-full grid-cols-[minmax(0,1fr)_76px] items-center gap-3 sm:grid-cols-[1fr_190px] sm:gap-5">
              <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 sm:text-[10px] sm:tracking-[0.24em]">{item.eyebrow}</p><h2 className="mt-2 text-xl font-black uppercase sm:mt-3 sm:text-4xl">{item.title}</h2><p className="mt-2 text-xs font-semibold leading-5 text-white/55 sm:mt-4 sm:text-sm sm:leading-6">{item.text}</p><p className="mt-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 sm:mt-7 sm:text-[10px] sm:tracking-[0.16em]">Esplora la sezione <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p></div>
              {item.image === "podio" ? (
                <div className="flex h-20 items-end justify-center gap-1 sm:h-36 sm:gap-2" aria-hidden="true"><div className="flex h-11 w-6 items-center justify-center rounded-t-lg bg-white/15 text-sm font-black text-white/60 sm:h-20 sm:w-12 sm:rounded-t-xl sm:text-xl">2</div><div className="flex h-18 w-7 items-center justify-center rounded-t-lg bg-amber-300 text-base font-black text-blue-950 shadow-[0_0_30px_rgba(251,191,36,0.25)] sm:h-32 sm:w-14 sm:rounded-t-xl sm:text-2xl">1</div><div className="flex h-9 w-6 items-center justify-center rounded-t-lg bg-white/10 text-sm font-black text-white/45 sm:h-16 sm:w-12 sm:rounded-t-xl sm:text-xl">3</div></div>
              ) : <Image unoptimized src={item.image} alt="" width={220} height={180} className="max-h-40 w-full object-contain drop-shadow-[0_15px_22px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-105" />}
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-10 sm:space-y-20">
        <section id="ranking" className="scroll-mt-28">
          <div className="mb-5 sm:mb-8"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 sm:text-xs sm:tracking-[0.28em]">Il Ranking</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Il Podio</h2></div>
          <RankingSmart rows={rows} />
        </section>
        <div className="border-t border-slate-200 pt-10 sm:pt-20">
          <div className="mb-5 sm:mb-8"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 sm:text-xs sm:tracking-[0.28em]">Trofei e memoria</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">L’Hall of Fame</h2></div>
          <HallOfFameContent embedded />
        </div>
      </div>
    </main>
  );
}
