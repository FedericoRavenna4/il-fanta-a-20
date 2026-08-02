"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ArcadeLeaderboardEntry } from "@/lib/arcade/types";
import type { GameTeam } from "@/lib/game/types";

export default function ArcadeLeaderboard({
  entries,
  teams,
  highlightedId,
}: {
  entries: ArcadeLeaderboardEntry[];
  teams: GameTeam[];
  highlightedId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const visibleEntries = entries.slice(0, expanded ? 100 : 10);

  return (
    <section id="hall-of-fame-arcade" className="mt-10 border-t border-blue-950/10 pt-10 sm:mt-16 sm:pt-14">
      <p className="section-eyebrow">Classifica ufficiale</p>
      <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-600 sm:text-base"><span className="sm:hidden">Resisti più a lungo che puoi per entrare in classifica!</span><span className="hidden sm:inline">Solo chi resiste più a lungo lascia il proprio nome nella storia.</span></p>

      {entries.length === 0 ? (
        <div className="mt-7 rounded-[1.5rem] border border-blue-950/10 bg-white/75 px-5 py-10 text-center text-sm font-bold text-slate-500 shadow-lg shadow-blue-950/5">
          La Hall of Fame aspetta il suo primo record.
        </div>
      ) : (
        <>
          <div className="mt-7 grid items-end gap-3 sm:grid-cols-3 sm:gap-4">
            {entries.slice(0, 3).map((entry, index) => (
              <PodiumCard
                key={entry.id}
                entry={entry}
                position={index + 1}
                team={teamsById.get(entry.societaId)}
                highlighted={entry.id === highlightedId}
              />
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-blue-950/10 bg-white/80 shadow-xl shadow-blue-950/7">
            <div className="hidden grid-cols-[4rem_minmax(0,1fr)_7rem_7rem_9rem] items-center gap-2 border-b border-blue-950/10 bg-blue-950 px-5 py-3 text-[9px] font-black uppercase tracking-[.16em] text-white/55 sm:grid">
              <span>Posizione</span><span>Giocatore</span><span className="text-center">Società</span><span className="text-center">Livello</span><span className="text-right">Metri</span>
            </div>
            <ol>
              {visibleEntries.map((entry, index) => {
                const team = teamsById.get(entry.societaId);
                const highlighted = entry.id === highlightedId;
                return (
                  <li key={entry.id} className={`grid grid-cols-[1.4rem_minmax(0,1fr)_1.7rem_2.8rem_4.5rem] items-center gap-1 border-b border-blue-950/[.07] px-2 py-2.5 transition last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)_7rem_7rem_9rem] sm:gap-2 sm:px-5 sm:py-3 ${highlighted ? "bg-amber-100 ring-2 ring-inset ring-amber-300" : ""}`}>
                    <span className="text-[10px] font-black tabular-nums text-blue-950/45 sm:text-sm">{index + 1}</span>
                    <span className="min-w-0 truncate text-[10px] font-black text-blue-950 sm:text-base">{entry.nomeGiocatore.toLocaleUpperCase("it-IT")}</span>
                    <span className="flex h-6 items-center justify-center sm:h-10">
                      {team && <Image src={team.logo} alt={`Stemma ${team.nome}`} width={42} height={42} sizes="(max-width: 639px) 24px, 40px" className="max-h-full max-w-full object-contain" />}
                    </span>
                    <span className="justify-self-center whitespace-nowrap rounded-full bg-blue-950/8 px-1.5 py-1 text-[8px] font-black uppercase tracking-[.03em] text-blue-950 sm:px-2.5 sm:text-[10px] sm:tracking-[.08em]">{levelLabel(entry.livello)}</span>
                    <strong className="whitespace-nowrap text-right text-[12px] font-black tabular-nums text-blue-700 sm:text-xl">{entry.metri.toLocaleString("it-IT")} m</strong>
                  </li>
                );
              })}
            </ol>
          </div>
          {!expanded && entries.length > 10 && (
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={() => setExpanded(true)} className="rounded-full border border-blue-950/15 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[.12em] text-blue-950 transition hover:border-blue-950 hover:bg-blue-950 hover:text-white">
                Espandi classifica
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PodiumCard({ entry, position, team, highlighted }: { entry: ArcadeLeaderboardEntry; position: number; team?: GameTeam; highlighted: boolean }) {
  const tone = position === 1
    ? "border-amber-300/60 bg-[linear-gradient(145deg,#fff8dc,#e8bd55)] shadow-amber-300/20 sm:min-h-52"
    : position === 2
      ? "border-slate-300/70 bg-[linear-gradient(145deg,#ffffff,#cbd5e1)] shadow-slate-400/15 sm:min-h-48"
      : "border-orange-300/60 bg-[linear-gradient(145deg,#fff4e8,#c98249)] shadow-orange-400/15 sm:min-h-44";
  return (
    <article className={`relative flex min-h-36 flex-col items-center justify-center rounded-[1.5rem] border p-3 text-center shadow-xl sm:p-4 ${tone} ${highlighted ? "ring-2 ring-blue-700 ring-offset-2" : ""}`}>
      <span className="absolute left-4 top-3 text-xs font-black uppercase tracking-[.15em] text-blue-950/45">#{position}</span>
      <div className={`flex items-center justify-center ${position === 1 ? "h-16 w-16" : "h-14 w-14"}`}>
        {team && <Image src={team.logo} alt={`Stemma ${team.nome}`} width={82} height={82} sizes="(max-width: 639px) 56px, 64px" className="max-h-full max-w-full object-contain drop-shadow-[0_8px_12px_rgba(15,23,42,.18)]" />}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-black text-blue-950 sm:text-base">{entry.nomeGiocatore.toLocaleUpperCase("it-IT")}</h3>
      <span className="mt-2 rounded-full bg-blue-950/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.1em] text-blue-950 sm:text-[10px]">{levelLabel(entry.livello)}</span>
      <strong className={`mt-2 font-black tabular-nums text-blue-950 ${position === 1 ? "text-3xl" : "text-2xl"}`}>{entry.metri.toLocaleString("it-IT")} m</strong>
    </article>
  );
}

function levelLabel(level: number) {
  return `Liv. ${level === 3 ? "III" : level === 2 ? "II" : "I"}`;
}
