import { createPageMetadata } from "@/lib/seo";
import { CampionatiContent } from "../campionati/page";
import { CoppeContent } from "../coppe/page";
import { ScattoPromozioneContent } from "../scatto-promozione/page";
import AnchorScroll from "../components/AnchorScroll";

export const metadata = createPageMetadata({ title: "Competizioni", description: "Scopri campionati, coppe e Scatto Promozione del Fanta a 20.", path: "/competizioni" });

export default function CompetizioniPage() {
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
    <AnchorScroll />
    <div className="space-y-10 sm:space-y-20">
      <section id="campionati" className="scroll-mt-28">
        <div className="mb-5 sm:mb-8"><p className="section-eyebrow">La piramide sportiva</p><h2 className="font-onder-title mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:mt-3 sm:text-5xl">I Campionati</h2></div>
        <CampionatiContent embedded />
      </section>
      <section id="coppe" className="scroll-mt-28 border-t border-slate-200 pt-10 sm:pt-20">
        <div className="mb-5 sm:mb-8"><p className="section-eyebrow">Il palcoscenico dei trofei</p><h2 className="font-onder-title mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:mt-3 sm:text-5xl">Le Coppe</h2></div>
        <CoppeContent embedded />
      </section>
      <section id="scatto-promozione" className="scroll-mt-28 border-t border-slate-200 pt-10 sm:pt-20">
        <div className="mb-5 min-w-0 sm:mb-8"><p className="section-eyebrow">La corsa finale</p><h2 className="font-onder-title mt-2 max-w-full text-3xl font-black uppercase tracking-tight text-blue-950 sm:mt-3 sm:text-5xl"><span className="block leading-[1.08] sm:inline sm:leading-none">Lo Scatto</span><span className="mt-1 block leading-[1.08] sm:ml-2 sm:mt-0 sm:inline sm:leading-none">Promozione</span></h2></div>
        <ScattoPromozioneContent embedded />
      </section>
    </div>
  </main>;
}
