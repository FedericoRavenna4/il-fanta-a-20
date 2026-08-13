import Image from "next/image";
import Link from "next/link";

export type CompetitionPath = {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  image?: string;
};

export const competitionPaths: CompetitionPath[] = [
  { eyebrow: "La piramide sportiva", title: "I Campionati", text: "Serie A, Serie B e tre gironi di Serie C.", href: "/competizioni#campionati", image: "/competizioni/serie-a-b-c.png" },
  { eyebrow: "Il palcoscenico dei trofei", title: "Le Coppe", text: "Coppa Fanta a 20 e competizioni europee.", href: "/competizioni#coppe", image: "/competizioni/champions-europa-conference.png" },
  { eyebrow: "La corsa finale", title: "Lo Scatto Promozione", text: "Nove giornate per conquistare la Serie B.", href: "/competizioni#scatto-promozione", image: "/scatto-promozione/background.png" },
];

export default function CompetitionPathCards({ paths = competitionPaths }: { paths?: CompetitionPath[] }) {
  return <div className={`grid gap-3 sm:gap-5 ${paths.length === 4 ? "md:grid-cols-2" : "lg:grid-cols-3"}`}>
    {paths.map((item) => <Link key={`${item.href}-${item.title}`} href={item.href} className="group relative min-h-0 overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1 hover:shadow-2xl sm:min-h-64 sm:p-7">
      <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 bg-sky-400/10 blur-[65px]" />
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_82px] items-stretch gap-3 sm:grid-cols-[1fr_120px] sm:gap-4">
        <div className="grid h-full grid-rows-[auto_auto_auto_auto]"><p className="text-[10px] font-black uppercase leading-4 tracking-[.2em] text-amber-300">{item.eyebrow}</p><h2 className="pt-2 text-2xl font-black uppercase leading-tight sm:text-3xl">{item.title}</h2><p className="pt-4 text-sm font-semibold leading-6 text-white/50">{item.text}</p><p className="pt-3 text-[10px] font-black uppercase tracking-[.17em] text-white/80 sm:pt-6">Esplora <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">&rarr;</span></p></div>
        {item.image ? <Image src={item.image} alt="" width={180} height={160} className="max-h-20 w-full self-center object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-105 sm:max-h-36" /> : <span aria-hidden="true" className="self-center text-center text-xs font-black uppercase tracking-widest text-amber-300/80">Regole</span>}
      </div>
    </Link>)}
  </div>;
}
