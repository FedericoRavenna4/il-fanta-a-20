"use client";

import Image from "next/image";
import type { GameSnapshot, GameTeam } from "@/lib/game/types";
import {
  LEVEL_RULES,
  resolveLevelOutcome,
  type ClubProgress,
  type GameLevel,
  type LevelResolution,
} from "@/lib/game/progression";

export default function GameOver({
  team,
  result,
  isNewRecord,
  playedLevel,
  progress,
  resolution,
  onRetry,
  onReturn,
}: {
  team: GameTeam;
  result: GameSnapshot;
  isNewRecord: boolean;
  playedLevel: GameLevel;
  progress: ClubProgress;
  resolution: LevelResolution | null;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const outcome = resolution ?? resolveLevelOutcome(playedLevel, result.distance);
  const playedRule = LEVEL_RULES[playedLevel];
  const nextRule = LEVEL_RULES[outcome.newLevel];
  const outcomeTone = outcome.outcome === "promoted" || outcome.outcome === "safe"
    ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-200"
    : outcome.outcome === "relegated"
      ? "border-rose-300/25 bg-rose-300/[.08] text-rose-200"
      : "border-sky-300/20 bg-sky-300/[.07] text-sky-100";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#020817]/82 p-3 backdrop-blur-md max-sm:overflow-hidden max-sm:p-2 sm:p-5">
      <section aria-live="polite" className="my-auto w-full max-w-lg rounded-[1.5rem] border border-white/12 bg-[linear-gradient(145deg,rgba(7,26,56,0.98),rgba(4,17,39,0.98))] p-4 text-center text-white shadow-[0_28px_80px_rgba(0,0,0,0.5)] max-sm:max-h-full max-sm:rounded-xl max-sm:p-2.5 sm:p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center max-sm:h-9 max-sm:w-9 sm:h-16 sm:w-16">
          <Image src={team.logo} alt={`Stemma ${team.nome}`} width={64} height={64} className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.32)]" />
        </div>
        <p className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-300 max-sm:mt-0.5">
          {isNewRecord ? "Nuovo record personale" : "Corsa terminata"}
        </p>
        <h2 className="mt-0.5 text-2xl font-black uppercase tracking-tight max-sm:text-lg sm:text-3xl">{outcome.title}</h2>
        <p className="mt-0.5 text-[9px] font-bold text-white/55">
          Livello {playedLevel} · {playedRule.name}
        </p>

        <div className={`mx-auto mt-2.5 rounded-xl border px-3 py-2 max-sm:mt-1.5 max-sm:py-1.5 ${outcomeTone}`}>
          <p className="text-[10px] font-black uppercase tracking-[.06em]">{outcome.message}</p>
          <p className="mt-0.5 text-[8px] font-semibold text-white/52">
            La nuova categoria sarà attiva dalla prossima partita.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 max-sm:mt-1.5 max-sm:gap-1.5">
          <Score label="Punteggio" value={result.score.toLocaleString("it-IT")} highlight />
          <Score label="Distanza" value={`${result.distance} m`} />
          <Score
            label="Record personale"
            value={`${result.personalRecord.toLocaleString("it-IT")} m`}
            highlight={isNewRecord}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/[.07] bg-white/[.035] px-3 py-2 text-left max-sm:mt-1.5 max-sm:py-1.5">
          <div className="min-w-0">
            <p className="text-[6px] font-black uppercase tracking-[.14em] text-white/35">Prossima corsa</p>
            <p className="truncate text-[10px] font-black uppercase text-white">
              Livello {outcome.newLevel} · {nextRule.name}
            </p>
          </div>
          {playedLevel === 3 && (
            <div className="shrink-0 text-right">
              <p className="text-[6px] font-black uppercase tracking-[.12em] text-white/35">Salvezze</p>
              <p className={`text-sm font-black tabular-nums ${outcome.badgeEarned ? "text-amber-300" : "text-white"}`}>
                {progress.level3Saves}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-2 max-sm:mt-1.5 max-sm:gap-1.5 sm:grid-cols-2">
          <button type="button" onClick={onRetry} className="min-h-11 rounded-full bg-amber-300 px-5 text-[9px] font-black uppercase tracking-[0.15em] text-blue-950 transition hover:bg-amber-200 max-sm:min-h-9">Gioca il livello {outcome.newLevel}</button>
          <button type="button" onClick={onReturn} className="min-h-11 rounded-full border border-white/15 bg-white/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/10 max-sm:min-h-10">Torna alla selezione</button>
        </div>
      </section>
    </div>
  );
}

function Score({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.045] px-2 py-2.5 max-sm:py-2">
      <p className="text-[6px] font-black uppercase tracking-[0.13em] text-white/35">{label}</p>
      <p className={`mt-1 truncate text-base font-black tabular-nums ${highlight ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
