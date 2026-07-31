import Image from "next/image";
import Link from "next/link";
import type { ArcadeLeaderboardEntry } from "@/lib/arcade/types";
import type { GameTeam } from "@/lib/game/types";

export default function ArcadeTopThree({ entries, teams }: { entries: ArcadeLeaderboardEntry[]; teams: GameTeam[] }) {
  if (entries.length === 0) return null;
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return (
    <section aria-label="Primi tre della classifica Arcade" className="mb-4 -mt-2 rounded-[1.25rem] border border-blue-950/10 bg-white/70 p-2.5 shadow-lg shadow-blue-950/5 sm:mb-7 sm:-mt-7 sm:p-4">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {entries.map((entry, index) => {
          const team = teamsById.get(entry.societaId);
          return (
            <article key={entry.id} className="grid min-w-0 grid-cols-[auto_1.25rem_minmax(0,1fr)] items-center gap-1 rounded-xl bg-blue-950 px-1.5 py-1.5 text-white sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 sm:py-3">
              <span className="text-[9px] font-black text-amber-300 sm:text-xs">#{index + 1}</span>
              <span className="flex h-5 w-5 items-center justify-center sm:h-8 sm:w-8">
                {team && <Image src={team.logo} alt={`Stemma ${team.nome}`} width={34} height={34} unoptimized className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[9px] font-black sm:text-xs">{entry.nomeGiocatore}</strong>
                <span className="block truncate text-[6px] font-bold uppercase tracking-[.06em] text-white/45 sm:text-[8px]">Liv. {romanLevel(entry.livello)}</span>
              </span>
              <strong className="col-span-3 text-right text-[12px] font-black tabular-nums text-sky-200 sm:col-span-1 sm:text-base">{entry.metri.toLocaleString("it-IT")} m</strong>
            </article>
          );
        })}
      </div>
      <div className="mt-2 flex justify-end sm:mt-3">
        <Link href="#hall-of-fame-arcade" className="text-[7px] font-black uppercase tracking-[.12em] text-blue-700 transition hover:text-blue-950 sm:text-[9px]">Visualizza la classifica →</Link>
      </div>
    </section>
  );
}

function romanLevel(level: number) {
  return level === 3 ? "III" : level === 2 ? "II" : "I";
}
