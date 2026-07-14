"use client";

import Image from "next/image";
import type { GameSnapshot, GameTeam } from "@/lib/game/types";

export default function GameHud({
  team,
  snapshot,
  onPause,
  paused,
  canPause,
}: {
  team: GameTeam;
  snapshot: GameSnapshot;
  onPause: () => void;
  paused: boolean;
  canPause: boolean;
}) {
  const danger = snapshot.teamRating <= snapshot.threshold + 0.5;
  const scaleStart = 61.5;
  const scaleEnd = Math.max(66, snapshot.nextGoalThreshold);
  const scaleLength = scaleEnd - scaleStart;
  const ratingProgress = Math.max(
    0,
    Math.min(100, ((snapshot.teamRating - scaleStart) / scaleLength) * 100)
  );
  const thresholdPosition =
    ((snapshot.threshold - scaleStart) / scaleLength) * 100;

  return (
    <div className="border-b border-white/10 bg-[linear-gradient(135deg,#06142c_0%,#0c2c52_52%,#07162f_100%)] px-1.5 py-1 text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)] sm:px-4 sm:py-2">
      <div className="grid grid-cols-4 items-center gap-x-0.5 gap-y-1 border-b border-white/[0.07] pb-1 sm:grid-cols-[minmax(160px,1fr)_auto_repeat(4,minmax(58px,auto))] sm:gap-1 sm:pb-1.5">
        <p className="col-span-3 min-w-0 truncate px-1 text-[8px] font-black uppercase tracking-tight text-white sm:col-span-1 sm:pl-0 sm:pr-1 sm:text-xs">
          {team.nome}
        </p>
        <button
          type="button"
          onClick={onPause}
          disabled={!canPause}
          className="min-h-6 rounded-full border border-white/10 bg-white/[0.06] px-1.5 text-[6px] font-black uppercase tracking-[0.06em] transition enabled:hover:bg-white/10 disabled:opacity-30 sm:min-h-8 sm:px-3 sm:text-[7px] sm:tracking-[0.08em]"
        >
          {paused ? "Riprendi" : "Pausa"}
        </button>
        <TopValue label="Gol" value={String(snapshot.goals)} accent />
        <TopValue label="Punti" value={formatNumber(snapshot.score)} />
        <TopValue label="Record" value={formatNumber(snapshot.best)} />
        <TopValue label="Metri" value={`${formatNumber(snapshot.distance)} m`} />
      </div>

      <div className={`mx-auto grid max-w-2xl grid-cols-[52px_minmax(0,1fr)] items-center gap-1 pb-0 pt-1 transition duration-300 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4 sm:pb-0.5 sm:pt-1.5 ${danger ? "animate-pulse" : ""}`}>
        <div className="flex h-12 w-12 items-center justify-center justify-self-start sm:h-20 sm:w-20">
          <Image
            src={team.logo}
            alt={`Stemma ${team.nome}`}
            width={80}
            height={80}
            className="max-h-full max-w-full object-contain drop-shadow-[0_7px_12px_rgba(0,0,0,0.32)]"
          />
        </div>

        <div className="min-w-0 text-center">
          <div className="flex items-end justify-center gap-1.5">
            {danger && (
              <span className="mb-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-300/70 text-[8px] font-black text-rose-200">
                !
              </span>
            )}
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/42">
                Voto squadra
                {snapshot.protectionActive && (
                  <span className="ml-1.5 text-sky-200/70">
                    Prot. {snapshot.protectionRemaining.toFixed(1)}s
                  </span>
                )}
              </p>
              <p className={`text-[1.65rem] font-black leading-[0.86] tracking-[-0.05em] tabular-nums sm:text-[2.35rem] ${danger ? "text-rose-200" : "text-amber-300"}`}>
                {formatRating(snapshot.teamRating)}
              </p>
            </div>
          </div>

          <div className="relative mx-auto mt-1 h-1.5 max-w-md rounded-full bg-rose-400/25">
            <span className="absolute inset-y-0 right-0 rounded-r-full bg-emerald-400/18" style={{ left: `${thresholdPosition}%` }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 transition-[width] duration-300" style={{ width: `${ratingProgress}%` }} />
            <span className="absolute -top-0.5 h-3 w-px bg-white/80" style={{ left: `${thresholdPosition}%` }} />
            <span className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full border border-white/80 bg-blue-950 transition-[left] duration-300" style={{ left: `${ratingProgress}%` }} />
          </div>

          <div className="relative mx-auto mt-0.5 h-2.5 max-w-md text-[6px] font-black uppercase tracking-[0.08em] text-white/32">
            <span className="absolute left-0">61,5</span>
            <span className="absolute -translate-x-1/2 text-white/65" style={{ left: `${thresholdPosition}%` }}>62</span>
            <span className="absolute right-0">{scaleEnd}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function TopValue({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-l border-white/10 px-0.5 text-center sm:px-3">
      <p className="text-[6px] font-black uppercase tracking-[0.11em] text-white/32">{label}</p>
      <p className={`truncate text-[8px] font-black tabular-nums sm:text-xs ${accent ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("it-IT");
}

function formatRating(value: number) {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: value % 1 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}
