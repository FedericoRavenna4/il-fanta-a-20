import Image from "next/image";
import Link from "next/link";
import type { Emblema } from "@/lib/emblemi";

export default function HomeEmblemShowcase({ emblems }: { emblems: Emblema[] }) {
  return <>
    <div className="group relative mt-6 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] sm:mt-9 sm:py-4 lg:hidden">
      <Link href="/emblemi" aria-label="Esplora tutti gli emblemi" className="absolute inset-0 z-[5] sm:hidden" />
      <div className="home-emblem-marquee flex w-max transition duration-300 group-hover:opacity-40">
        {[0, 1].map((copy) => <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-4 pr-4 sm:gap-7 sm:pr-7">
          {emblems.map((emblem) => <span key={`${copy}-${emblem.id}`} className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-20 sm:w-20"><Image src={emblem.immagine} alt="" width={86} height={86} className="max-h-[94%] max-w-[94%] object-contain saturate-[.94] drop-shadow-[0_3px_5px_rgba(30,64,175,.12)]" /></span>)}
        </div>)}
      </div>
      <Link href="/emblemi" className="home-emblem-cta z-10 whitespace-nowrap rounded-full border border-blue-950/10 bg-white/90 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-blue-950 shadow-xl backdrop-blur transition duration-300 hover:border-blue-950/10 hover:bg-white/90 hover:text-blue-950">Esplora tutti gli emblemi</Link>
    </div>
    <Link href="/emblemi" aria-label="Esplora tutti gli emblemi" className="group relative mx-auto mt-8 hidden max-w-6xl overflow-hidden py-2 lg:block">
      <div className="grid grid-cols-12 items-center gap-4 transition duration-300 group-hover:opacity-35">
        {emblems.slice(0, 12).map((emblem) => <span key={emblem.id} className="flex h-20 items-center justify-center"><Image src={emblem.immagine} alt={emblem.nome} width={88} height={88} className="max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_8px_13px_rgba(30,64,175,.14)]" /></span>)}
      </div>
      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-blue-950/10 bg-white/90 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-blue-950 opacity-0 shadow-xl backdrop-blur transition duration-300 group-hover:opacity-100">Esplora tutti gli emblemi</span>
    </Link>
  </>;
}
