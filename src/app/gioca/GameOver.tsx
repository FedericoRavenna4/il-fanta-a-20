"use client";

import Image from "next/image";
import type { ArcadeSaveResult } from "@/lib/arcade/types";
import type { GameSnapshot, GameTeam } from "@/lib/game/types";
import {
  resolveLevelOutcome,
  type GameLevel,
  type LevelResolution,
} from "@/lib/game/progression";

export default function GameOver({
  team,
  result,
  isNewRecord,
  playedLevel,
  resolution,
  saveResult,
  savePending,
  onRetry,
  onReturn,
}: {
  team: GameTeam;
  result: GameSnapshot;
  isNewRecord: boolean;
  playedLevel: GameLevel;
  resolution: LevelResolution | null;
  saveResult: ArcadeSaveResult | null;
  savePending: boolean;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const outcome = resolution ?? resolveLevelOutcome(playedLevel, result.distance);
  const outcomeTone = outcome.outcome === "promoted" || outcome.outcome === "safe"
    ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-200"
    : outcome.outcome === "relegated"
      ? "border-rose-300/25 bg-rose-300/[.08] text-rose-200"
      : "border-sky-300/20 bg-sky-300/[.07] text-sky-100";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#020817]/82 p-3 backdrop-blur-md max-sm:overflow-hidden max-sm:p-2 sm:p-5">
      <section aria-live="polite" className="my-auto max-h-full w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-white/12 bg-[linear-gradient(145deg,rgba(7,26,56,0.98),rgba(4,17,39,0.98))] p-4 text-center text-white shadow-[0_28px_80px_rgba(0,0,0,0.5)] max-sm:rounded-xl max-sm:p-2.5 sm:p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center max-sm:h-9 max-sm:w-9 sm:h-16 sm:w-16">
          <Image src={team.logo} alt={`Stemma ${team.nome}`} width={64} height={64} className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.32)]" />
        </div>
        {isNewRecord && (
          <p className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-300 max-sm:mt-0.5">
            Nuovo record personale
          </p>
        )}
        <h2 className={`${isNewRecord ? "mt-0.5" : "mt-2 max-sm:mt-0.5"} text-2xl font-black uppercase tracking-tight max-sm:text-lg sm:text-3xl`}>Corsa terminata</h2>

        {outcome.outcome !== "stayed" && (
          <div className={`mx-auto mt-2.5 rounded-xl border px-3 py-2 max-sm:mt-1.5 max-sm:py-1.5 ${outcomeTone}`}>
            <p className="text-[9px] font-black uppercase tracking-[.06em]">{outcome.title} · {outcome.message}</p>
          </div>
        )}

        <div className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-2 max-sm:mt-1.5 max-sm:gap-1.5">
          <Score label="Livello" value={`${playedLevel}`} emphasize />
          <Score label="Distanza" value={`${result.distance} m`} />
          <Score
            label="Record personale"
            value={<>
              <span className="hidden sm:inline">Livello {result.personalRecordLevel} · {result.personalRecord.toLocaleString("it-IT")} m</span>
              <span className="flex flex-col items-center leading-tight sm:hidden">
                <span className="text-[9px] uppercase tracking-[.04em]">Livello {result.personalRecordLevel}</span>
                <span className="mt-0.5 text-sm">{result.personalRecord.toLocaleString("it-IT")} m</span>
              </span>
            </>}
            highlight={isNewRecord}
          />
        </div>

        {result.distance >= 100 ? (
          <div className="mx-auto mt-3 max-w-sm rounded-lg border border-white/[.07] bg-white/[.035] px-3 py-2 text-[9px] font-bold max-sm:mt-2" role="status">
            {savePending ? (
              <span className="inline-flex items-center gap-2 text-white/60"><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-amber-300" /> Salvataggio del record…</span>
            ) : saveResult ? (
              <span className={`whitespace-pre-line ${saveResult.ok ? "text-emerald-200" : "text-rose-200"}`}>{saveResult.message}</span>
            ) : (
              <span className="text-white/50">Preparazione del salvataggio…</span>
            )}
          </div>
        ) : (
          <p className="mt-2.5 rounded-lg border border-white/[.07] bg-white/[.035] px-3 py-2 text-[9px] font-bold text-white/60 max-sm:mt-1.5">Percorri almeno 100 metri per entrare in classifica.</p>
        )}

        <div className="mt-3 grid gap-2 max-sm:mt-1.5 max-sm:gap-1.5 sm:grid-cols-2">
          <button type="button" onClick={onRetry} className="min-h-11 rounded-full bg-amber-300 px-5 text-[9px] font-black uppercase tracking-[0.15em] text-blue-950 transition hover:bg-amber-200 max-sm:min-h-9">Rigioca</button>
          <button type="button" onClick={onReturn} className="min-h-11 rounded-full border border-white/15 bg-white/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/10 max-sm:min-h-10">Torna alla selezione</button>
        </div>
      </section>
    </div>
  );
}

function Score({ label, value, highlight = false, emphasize = false }: { label: string; value: React.ReactNode; highlight?: boolean; emphasize?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.045] px-2 py-2.5 max-sm:py-2">
      <p className="text-[6px] font-black uppercase tracking-[0.13em] text-white/35">{label}</p>
      <div className={`mt-1 min-w-0 font-black tabular-nums ${emphasize ? "text-lg text-sky-200" : "text-base"} ${highlight ? "text-amber-300" : emphasize ? "" : "text-white"}`}>{value}</div>
    </div>
  );
}
