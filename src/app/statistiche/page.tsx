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
    image: "/hall-of-fame/vetrina-trofei.png",
  },
];

export default function StatistichePage() {
  const rows = getRankingRows();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Numeri e memoria storica"
        title="Le Statistiche"
        description="Ranking e Hall of Fame raccontano il valore, i successi e l’eredità sportiva delle società del Fanta a 20."
      />

      <div className="mb-20 grid gap-5 md:grid-cols-2">
        {percorsi.map((item) => (
          <Link key={item.title} href={item.href} className="group relative min-h-64 overflow-hidden rounded-[2rem] bg-blue-950 p-7 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1 hover:shadow-2xl sm:p-9">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-sky-400/10 blur-[75px]" />
            <div className="relative grid h-full grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_190px]">
              <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">{item.eyebrow}</p><h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">{item.title}</h2><p className="mt-4 text-sm font-semibold leading-6 text-white/55">{item.text}</p><p className="mt-7 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">Esplora la sezione <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p></div>
              {item.image === "podio" ? (
                <div className="flex h-36 items-end justify-center gap-2" aria-hidden="true"><div className="flex h-20 w-12 items-center justify-center rounded-t-xl bg-white/15 text-xl font-black text-white/60">2</div><div className="flex h-32 w-14 items-center justify-center rounded-t-xl bg-amber-300 text-2xl font-black text-blue-950 shadow-[0_0_30px_rgba(251,191,36,0.25)]">1</div><div className="flex h-16 w-12 items-center justify-center rounded-t-xl bg-white/10 text-xl font-black text-white/45">3</div></div>
              ) : <Image src={item.image} alt="" width={220} height={180} className="max-h-40 w-full object-contain drop-shadow-[0_15px_22px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-105" />}
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-20">
        <section id="ranking" className="scroll-mt-28">
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">Il Ranking</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Il Podio</h2></div>
          <RankingSmart rows={rows} />
        </section>
        <div className="border-t border-slate-200 pt-20">
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">Trofei e memoria</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">L’Hall of Fame</h2></div>
          <HallOfFameContent embedded />
        </div>
      </div>
    </main>
  );
}
