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

        <GameClient teams={teams} initialTeamSlug={requestedTeam} />

        <section className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Rule code="CTRL" title="Due movimenti" text="Salta gli ostacoli bassi e abbassati sotto quelli sospesi." />
          <Rule code="VOTO" title="Difendi il 62" text="Bonus e malus cambiano il voto. Sotto la soglia la corsa termina." />
          <Rule code="GOL" title="Segna ogni quattro" text="Ogni quattro punti sopra il 62 vale un nuovo gol." />
          <Rule code="REC" title="Batti il record" text="La migliore distanza resta salvata sul dispositivo." />
        </section>
      </div>
    </main>
  );
}

function getLeagueAccent(league: string): GameTeam["accent"] {
  if (league.startsWith("Serie A")) return "sky";
  if (league.startsWith("Serie B")) return "lime";
  return "violet";
}

function Rule({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.055)] backdrop-blur-md">
      <p className="text-[7px] font-black uppercase tracking-[0.18em] text-amber-600">{code}</p>
      <h2 className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-blue-950">{title}</h2>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{text}</p>
    </article>
  );
}
