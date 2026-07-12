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
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Il sistema sportivo"
        title="Le Competizioni"
        description="Campionati, coppe e percorsi speciali compongono una stagione in cui ogni società può inseguire il proprio posto nella storia."
      />

      <div className="mb-20 grid gap-5 lg:grid-cols-3">
        {percorsi.map((item) => (
          <Link key={item.title} href={item.href} className="group relative min-h-64 overflow-hidden rounded-[2rem] bg-blue-950 p-7 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 bg-sky-400/10 blur-[65px]" />
            <div className="relative grid h-full grid-cols-1 items-stretch gap-4 sm:grid-cols-[1fr_120px]">
              <div className="grid h-full grid-rows-[2rem_4rem_1fr_auto]"><p className="text-[9px] font-black uppercase leading-4 tracking-[0.22em] text-amber-300">{item.eyebrow}</p><h2 className="pt-2 text-2xl font-black uppercase leading-tight">{item.title}</h2><p className="pt-4 text-sm font-semibold leading-6 text-white/50">{item.text}</p><p className="pt-6 text-[9px] font-black uppercase tracking-[0.16em] text-white/80">Esplora <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p></div>
              <Image src={item.image} alt="" width={180} height={160} className="max-h-36 w-full self-center object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-105" />
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-20">
        <section>
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">La piramide sportiva</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">I Campionati</h2></div>
          <CampionatiContent embedded />
        </section>

        <section className="border-t border-slate-200 pt-20">
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">Trofei e grandi notti</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Le Coppe</h2></div>
          <CoppeContent embedded />
        </section>

        <section className="border-t border-slate-200 pt-20">
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">La quarta promozione</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">Lo Scatto Promozione</h2></div>
          <ScattoPromozioneContent embedded />
        </section>
      </div>
    </main>
  );
}
