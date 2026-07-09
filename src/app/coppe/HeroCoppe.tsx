import Image from "next/image";
import Link from "next/link";

const coppeEuropee = [
  {
    nome: "CHAMPIONS LEAGUE",
    href: "#champions-league",
    descrizione:
      "Il trofeo più prestigioso riservato alle migliori otto squadre del girone d'andata.",
    image: "/trofei/champions-league.png",
    className:
      "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-blue-950/40",
  },
  {
    nome: "EUROPA LEAGUE",
    href: "#europa-league",
    descrizione:
      "Una coppa di carattere: può trasformare una stagione solida in una stagione da ricordare.",
    image: "/trofei/europa-league.png",
    className:
      "border-orange-400 bg-gradient-to-br from-orange-600 via-orange-400 to-orange-100 text-white shadow-orange-300/70",
  },
  {
    nome: "CONFERENCE LEAGUE",
    href: "#conference-league",
    descrizione:
      "Il trofeo della rivalsa: dà orgoglio e finale glorioso anche alle stagioni più complicate.",
    image: "/trofei/conference-league.png",
    className:
      "border-emerald-900/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 text-white shadow-emerald-950/40",
  },
];

export default function HeroCoppe() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-sky-700 px-8 py-10 text-white">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-sky-200">
          Coppe
        </p>

        <h1 className="mt-4 text-5xl font-black tracking-tight">
          Le Coppe Ufficiali del Fanta a 20
        </h1>

        <p className="mt-6 max-w-6xl text-[20px] font-medium leading-9 text-white/85">
          Le coppe ufficiali sono il palcoscenico delle grandi notti del Fanta
          a 20: dalle competizioni europee interne a ogni lega fino alla Coppa
          Fanta a 20, il trofeo più ambito e l'unico capace di riunire tutte le
          100 società in un'unica corsa verso la gloria.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <Link
          href="#coppa-fanta-a-20"
          className="group relative block min-h-[260px] overflow-hidden rounded-[1.75rem] border border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-100 to-white p-8 shadow-lg shadow-amber-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-300/40"
        >
          <div className="relative z-10 max-w-[58%]">
            <div className="mb-5 inline-flex rounded-full border border-amber-300 bg-white/60 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm">
              Coppa in evidenza
            </div>

            <h2 className="whitespace-nowrap text-5xl font-black uppercase tracking-tight text-blue-950">
              Coppa Fanta a 20
            </h2>

            <p className="mt-5 max-w-3xl text-[18px] font-medium leading-8 text-blue-950/75">
              La competizione più ambita del Fanta a 20: cento società nello
              stesso cammino, una lunga qualificazione, sessantaquattro posti
              nel tabellone finale e un solo trofeo capace di consacrare una
              stagione.
            </p>
          </div>

          <Image
            src="/trofei/coppa-fanta-a-20.png"
            alt="Coppa Fanta a 20"
            width={230}
            height={230}
            className="absolute right-8 top-1/2 h-auto max-h-56 w-auto -translate-y-1/2 object-contain drop-shadow-[0_0_38px_rgba(251,191,36,0.95)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-2 group-hover:drop-shadow-[0_0_55px_rgba(251,191,36,1)]"
          />
        </Link>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Coppe europee
          </p>

          <div className="grid gap-5 lg:grid-cols-3">
            {coppeEuropee.map((coppa) => (
              <Link
                href={coppa.href}
                key={coppa.nome}
                className={`group relative block min-h-[190px] overflow-hidden rounded-[1.75rem] border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${coppa.className}`}
              >
                <div className="relative z-10 max-w-[62%]">
                  <h2 className="whitespace-nowrap text-[22px] font-black uppercase tracking-tight">
                    {coppa.nome}
                  </h2>

                  <p className="mt-3 text-[14px] font-medium leading-6 opacity-80">
                    {coppa.descrizione}
                  </p>
                </div>

                <Image
                  src={coppa.image}
                  alt={coppa.nome}
                  width={145}
                  height={145}
                  className="absolute right-10 top-1/2 h-auto max-h-32 w-auto -translate-y-1/2 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.45)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_42px_rgba(255,255,255,0.85)]"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}