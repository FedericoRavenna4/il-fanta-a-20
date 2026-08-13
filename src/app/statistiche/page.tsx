import { createPageMetadata } from "@/lib/seo";
import RankingSmart from "../ranking/RankingSmart";
import { HallOfFameContent } from "../hall-of-fame/page";
import { getRankingRows } from "@/lib/rankingRows";
import AnchorScroll from "../components/AnchorScroll";

export const metadata = createPageMetadata({
  title: "Statistiche",
  description: "Ranking storico, Hall of Fame, record e protagonisti ufficiali del Fanta a 20.",
  path: "/statistiche",
});

export default async function StatistichePage() {
  const rows = await getRankingRows();
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
    <AnchorScroll />
    <div className="space-y-10 sm:space-y-20">
      <section id="ranking" className="scroll-mt-28">
        <div className="mb-5 sm:mb-8"><p className="section-eyebrow">{"La gerarchia delle societ\u00e0"}</p><h1 className="font-onder-title mt-2 text-3xl uppercase text-blue-950 sm:text-5xl">Il Ranking Storico</h1></div>
        <RankingSmart rows={rows} />
      </section>
      <section id="hall-of-fame" className="scroll-mt-28 border-t border-slate-200 pt-10 sm:pt-20">
        <div className="mb-5 sm:mb-8"><p className="section-eyebrow">I vincitori del passato</p><h2 className="font-onder-title mt-2 text-3xl uppercase text-blue-950 sm:text-5xl">L&apos;Hall of Fame</h2></div>
        <HallOfFameContent embedded />
      </section>
    </div>
  </main>;
}
