import Image from "next/image";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { CampionatiContent } from "../campionati/page";
import { CoppeContent } from "../coppe/page";
import { ScattoPromozioneContent } from "../scatto-promozione/page";

const percorsi = [
  {
    eyebrow: "La piramide sportiva",
    title: "I Campionati",
    text: "Serie A, Serie B e tre gironi di Serie C.",
    href: "#campionati",
    image: "/competizioni/serie-a-b-c.png",
  },
  {
    eyebrow: "Il palcoscenico dei trofei",
    title: "Le Coppe",
    text: "Coppa Fanta a 20 e competizioni europee.",
    href: "#coppe",
    image: "/competizioni/champions-europa-conference.png",
  },
  {
    eyebrow: "La corsa finale",
    title: "Lo Scatto Promozione",
    text: "Nove giornate per conquistare la Serie B.",
    href: "#scatto-promozione",
    image: "/scatto-promozione/background.png",
  },
];

export default function CompetizioniPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Il sistema sportivo"
        title="Le Competizioni"
        description="Campionati, coppe e percorsi speciali compongono una stagione in cui ogni società può inseguire il proprio posto nella storia."
      />

      <div className="mb-10 grid gap-3 sm:mb-20 sm:gap-5 lg:grid-cols-3">
        {percorsi.map((item) => (
          <Link key={item.title} href={item.href} className="group relative min-h-0 overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1 hover:shadow-2xl sm:min-h-64 sm:p-7">
            <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 bg-sky-400/10 blur-[65px]" />
            <div className="relative grid h-full grid-cols-[minmax(0,1fr)_82px] items-stretch gap-3 sm:grid-cols-[1fr_120px] sm:gap-4">
              <div className="grid h-full grid-rows-[auto_auto_auto_auto]"><p className="text-[9px] font-black uppercase leading-4 tracking-[0.18em] text-amber-300 sm:tracking-[0.22em]">{item.eyebrow}</p><h2 className="pt-1 text-lg font-black uppercase leading-tight sm:pt-2 sm:text-2xl">{item.title}</h2><p className="pt-2 text-xs font-semibold leading-5 text-white/50 sm:pt-4 sm:text-sm sm:leading-6">{item.text}</p><p className="pt-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 sm:pt-6 sm:tracking-[0.16em]">Esplora <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p></div>
              <Image src={item.image} alt="" width={180} height={160} className="max-h-20 w-full self-center object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-105 sm:max-h-36" />
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-10 sm:space-y-20">
        <section>
          <div className="mb-5 sm:mb-8"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 sm:text-xs sm:tracking-[0.28em]">La piramide sportiva</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">I Campionati</h2></div>
          <CampionatiContent embedded />
        </section>

        <section className="border-t border-slate-200 pt-10 sm:pt-20">
          <div className="mb-5 sm:mb-8"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 sm:text-xs sm:tracking-[0.28em]">Trofei e grandi notti</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Le Coppe</h2></div>
          <CoppeContent embedded />
        </section>

        <section className="border-t border-slate-200 pt-10 sm:pt-20">
          <div className="mb-5 sm:mb-8"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 sm:text-xs sm:tracking-[0.28em]">La corsa finale</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Lo Scatto Promozione</h2></div>
          <ScattoPromozioneContent embedded />
        </section>

      </div>
    </main>
  );
}
