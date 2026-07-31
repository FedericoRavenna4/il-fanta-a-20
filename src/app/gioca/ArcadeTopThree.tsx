import Image from "next/image";
import Link from "next/link";
import type { ArcadeLeaderboardEntry } from "@/lib/arcade/types";
import type { GameTeam } from "@/lib/game/types";

export default function ArcadeTopThree({ entries, teams }: { entries: ArcadeLeaderboardEntry[]; teams: GameTeam[] }) {
  if (entries.length === 0) return null;
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return (
    <section aria-label="Primi tre della classifica Arcade" className="mb-3 rounded-xl border border-blue-950/10 bg-white/70 p-1.5 shadow-lg shadow-blue-950/5 sm:mb-7 sm:p-4">
      <div className="grid grid-cols-3 gap-1 sm:gap-3">
        {entries.map((entry, index) => {
          const team = teamsById.get(entry.societaId);
          return (
            <article key={entry.id} className="grid min-w-0 grid-cols-[auto_1rem_minmax(0,1fr)] items-center gap-0.5 rounded-lg bg-blue-950 px-1 py-1 text-white sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3">
              <span className="text-[7px] font-black text-amber-300 sm:text-xs">#{index + 1}</span>
              <span className="flex h-4 w-4 items-center justify-center sm:h-8 sm:w-8">
                {team && <Image src={team.logo} alt={`Stemma ${team.nome}`} width={34} height={34} unoptimized className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[7px] font-black sm:text-xs">{entry.nomeGiocatore}</strong>
                <span className="block truncate text-[5px] font-bold uppercase tracking-[.03em] text-white/45 sm:text-[8px] sm:tracking-[.06em]">Liv. {romanLevel(entry.livello)}</span>
              </span>
              <strong className="col-span-3 text-right text-[10px] font-black leading-none tabular-nums text-sky-200 sm:col-span-1 sm:text-base">{entry.metri.toLocaleString("it-IT")} m</strong>
            </article>
          );
        })}
      </div>
      <div className="mt-1 flex justify-end sm:mt-3">
        <Link href="#hall-of-fame-arcade" className="text-[6px] font-black uppercase tracking-[.08em] text-blue-700 transition hover:text-blue-950 sm:text-[9px] sm:tracking-[.12em]">Visualizza la classifica →</Link>
      </div>
    </section>
  );
}

function romanLevel(level: number) {
  return level === 3 ? "III" : level === 2 ? "II" : "I";
}
