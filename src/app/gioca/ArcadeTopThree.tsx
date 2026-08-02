"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ArcadeLeaderboardEntry } from "@/lib/arcade/types";
import type { GameTeam } from "@/lib/game/types";

export default function ArcadeTopThree({ entries, teams }: { entries: ArcadeLeaderboardEntry[]; teams: GameTeam[] }) {
  const [liveEntries, setLiveEntries] = useState(entries.slice(0, 3));
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setLiveEntries((event as CustomEvent<ArcadeLeaderboardEntry[]>).detail.slice(0, 3));
    };
    window.addEventListener("arcade-leaderboard-updated", handleUpdate);
    return () => window.removeEventListener("arcade-leaderboard-updated", handleUpdate);
  }, []);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  if (liveEntries.length === 0) return null;
  return (
    <section aria-label="Primi tre della classifica Arcade" className="mb-3 rounded-xl border border-sky-200/70 bg-gradient-to-r from-white/90 via-sky-50/80 to-white/90 p-2 shadow-lg shadow-blue-950/8 sm:mb-7 sm:p-4">
      <div className="grid grid-cols-3 gap-1 sm:gap-3">
        {liveEntries.map((entry, index) => {
          const team = teamsById.get(entry.societaId);
          const tone = index === 0
            ? "bg-[linear-gradient(145deg,rgba(255,255,255,.48)_0%,rgba(255,255,255,0)_30%),linear-gradient(135deg,#ffe878_0%,#d9aa08_48%,#f3ca45_100%)]"
            : index === 1
              ? "bg-[linear-gradient(145deg,rgba(255,255,255,.58)_0%,rgba(255,255,255,0)_32%),linear-gradient(135deg,#dce3ea_0%,#8d99a6_50%,#c7d0d9_100%)]"
              : "bg-[linear-gradient(145deg,rgba(255,255,255,.34)_0%,rgba(255,255,255,0)_30%),linear-gradient(135deg,#d99867_0%,#a85f32_50%,#c77a45_100%)]";
          return (
            <article key={entry.id} className={`grid min-w-0 grid-cols-[auto_1.15rem_minmax(0,1fr)] items-center gap-1 rounded-lg border border-white/40 px-1.5 py-1.5 text-white shadow-md [text-shadow:0_1px_3px_rgba(15,23,42,.58)] sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3 ${tone}`}>
              <span className="text-[8px] font-black text-blue-950 [text-shadow:none] sm:text-xs">#{index + 1}</span>
              <span className="flex h-4 w-4 items-center justify-center sm:h-8 sm:w-8">
                {team && <Image src={team.logo} alt={`Stemma ${team.nome}`} width={34} height={34} sizes="(max-width: 639px) 16px, 32px" className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[8px] font-black text-blue-950 [text-shadow:none] sm:text-xs">{entry.nomeGiocatore.toLocaleUpperCase("it-IT")}</strong>
                <span className="mt-0.5 block truncate text-[7px] font-black uppercase tracking-[.04em] text-blue-950 [text-shadow:none] sm:text-[10px] sm:tracking-[.07em]">Livello {romanLevel(entry.livello)}</span>
              </span>
              <strong className="col-span-3 text-right text-[11px] font-black leading-none tabular-nums sm:col-span-1 sm:text-base">{entry.metri.toLocaleString("it-IT")} m</strong>
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
