import Image from "next/image";
import Link from "next/link";
import PageHeader from "../components/PageHeader";

const games = [
  { href: "/fantabet", eyebrow: "Pronostica e sfida gli altri", title: "Il FantaBet", image: "/images/gioca/fantabet.png" },
  { href: "/gioca", eyebrow: "Divertiti e scala le classifiche", title: "L'Arcade", image: "/images/gioca/arcade.png" },
] as const;

export default function GiochiPage() {
  return <main className="mx-auto min-h-[70vh] w-full max-w-7xl px-2 py-7 min-[390px]:px-3 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
    <PageHeader eyebrow="Mettiti alla prova" title="I Giochi" onderTitle compact description={"Due modalit\u00e0, una sola voglia di sfida: pronostica con FantaBet o scala le classifiche Arcade."} />
    <nav aria-label="Sezioni Gioca" className="grid grid-cols-2 gap-2 min-[390px]:gap-2.5 sm:gap-5">
      {games.map((game) => <Link key={game.href} href={game.href} aria-label={`Apri ${game.title}`} className="group relative flex min-h-72 min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-sky-200/80 bg-[radial-gradient(circle_at_50%_48%,rgba(125,211,252,.36),transparent_40%),linear-gradient(180deg,#ffffff_0%,#e0f2fe_58%,#bfdbfe_100%)] p-2.5 shadow-[0_20px_40px_-25px_rgba(7,31,69,.78)] ring-1 ring-inset ring-white/80 transition hover:-translate-y-1 hover:shadow-2xl active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 min-[390px]:p-3 sm:min-h-[30rem] sm:rounded-[2rem] sm:p-8 lg:min-h-[36rem]">
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 left-1/4 h-28 w-28 rounded-full bg-amber-300/15 blur-3xl" />
        <h2 className="relative text-center text-base font-black uppercase text-blue-950 min-[390px]:text-lg sm:text-4xl">{game.title}</h2>
        <span className="relative my-1.5 flex min-h-0 min-w-0 flex-1 items-center justify-center sm:my-5"><Image src={game.image} alt="" width={620} height={620} className="h-full max-h-[23rem] w-full object-contain drop-shadow-[0_18px_24px_rgba(7,31,69,.25)] transition duration-500 group-hover:scale-[1.03]" /></span>
        <p className="relative mt-auto text-center text-[9px] font-black uppercase leading-4 tracking-[.13em] text-orange-700 sm:text-xs sm:tracking-[.2em]">{game.eyebrow}</p>
      </Link>)}
    </nav>
  </main>;
}
