import type { Metadata } from "next";
import { getSocieta } from "@/lib/societa";
import type { GameTeam } from "@/lib/game/types";
import GameClient from "./GameClient";

export const metadata: Metadata = {
  title: "Sala Giochi | Il Fanta a 20",
  description: "Entra nella Sala Giochi ufficiale del Fanta a 20 e porta la tua società in corsa.",
};

export default async function GiocaPage({
  searchParams,
}: {
  searchParams: Promise<{ societa?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedTeam = Array.isArray(params.societa)
    ? params.societa[0]
    : params.societa;
  const teams: GameTeam[] = getSocieta()
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      nome: team.nome,
      logo: team.logo,
      lega: team.legaAttuale,
      accent: getLeagueAccent(team.legaAttuale),
    }))
    .sort((first, second) => first.nome.localeCompare(second.nome, "it"));

  return (
    <main className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#eef3f9_0%,#ffffff_38%,#f8fafc_100%)] text-blue-950">
      <div className="pointer-events-none absolute -left-40 top-28 -z-10 h-96 w-96 rounded-full bg-sky-300/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-48 top-[32rem] -z-10 h-[32rem] w-[32rem] rounded-full bg-indigo-200/20 blur-[130px]" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-10 lg:px-6 lg:pt-12">
        <header className="relative mb-5 overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(125deg,#051329_0%,#0b2d57_56%,#164878_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] sm:mb-7 sm:rounded-[2rem] sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-[70px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-sky-200/55 to-transparent" />
          <div className="relative">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-300 sm:text-[10px]">
                Il Fanta a 20 · Arcade Room
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase leading-[0.94] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Sala Giochi
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-5 text-white/62 sm:text-base sm:leading-7">
                Scegli il tuo stemma, entra in campo e trasforma ogni corsa in un nuovo record.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4">
          <Rule
            title="Muoviti e sopravvivi"
            text="Salta gli ostacoli e abbassati sotto quelli sospesi."
            mobileTitle="Salta. Schiva. Corri."
            mobileText="Supera gli ostacoli senza fermarti."
            tone="sky"
          />
          <Rule
            title="Resta sopra il 62"
            text="Bonus e malus cambiano il voto. Sotto la soglia, la corsa finisce."
            mobileTitle="Difendi il 62"
            mobileText="Sotto la soglia, la corsa finisce."
            tone="amber"
          />
        </section>

        <GameClient teams={teams} initialTeamSlug={requestedTeam} />
      </div>
    </main>
  );
}

function getLeagueAccent(league: string): GameTeam["accent"] {
  if (league.startsWith("Serie A")) return "sky";
  if (league.startsWith("Serie B")) return "lime";
  return "violet";
}

function Rule({ title, text, mobileTitle, mobileText, tone }: { title: string; text: string; mobileTitle: string; mobileText: string; tone: "sky" | "amber" }) {
  const accent = tone === "sky" ? "from-sky-400/30 text-sky-700" : "from-amber-400/35 text-amber-700";
  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/90 bg-white/80 px-3 py-2.5 shadow-[0_12px_34px_rgba(15,23,42,0.065)] backdrop-blur-md sm:rounded-2xl sm:px-4 sm:py-3 lg:col-span-2">
      <span className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent.split(" ")[0]} to-transparent`} />
      <h2 className={`text-[10px] font-black uppercase leading-tight tracking-[0.08em] sm:text-sm ${accent.split(" ")[1]}`}>
        <span className="sm:hidden">{mobileTitle}</span><span className="hidden sm:inline">{title}</span>
      </h2>
      <p className="mt-1 text-[9px] font-semibold leading-3.5 text-slate-500 sm:text-xs sm:leading-4">
        <span className="sm:hidden">{mobileText}</span><span className="hidden sm:inline">{text}</span>
      </p>
    </article>
  );
}
