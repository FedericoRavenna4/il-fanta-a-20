"use client";

import type { GameSnapshot, GameTeam } from "@/lib/game/types";

export default function GameHud({ team, snapshot, paused, onTogglePause }: {
  team: GameTeam;
  snapshot: GameSnapshot;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const warning = snapshot.teamRating <= 64;
  const critical = snapshot.teamRating <= 62.5;
  const nextGoal = snapshot.nextGoalThreshold;
  const ratingProgress = Math.max(0, Math.min(100,
    ((snapshot.teamRating - snapshot.threshold) / Math.max(1, nextGoal - snapshot.threshold)) * 100
  ));
  const hudTone = snapshot.rafficaType === "malus"
    ? "border-rose-300/22 bg-[linear-gradient(135deg,#160914,#501426_48%,#100812_100%)]"
    : snapshot.rafficaType === "bonus"
      ? "border-amber-200/22 bg-[linear-gradient(135deg,#181104,#5d3a0c_48%,#130e04_100%)]"
      : "border-white/10 bg-[linear-gradient(135deg,#06142c_0%,#0c2c52_52%,#07162f_100%)]";

  return (
    <div className={`border-b px-2.5 py-1.5 text-white transition-colors duration-700 sm:px-5 sm:py-2.5 ${hudTone}`}>
      <div className="flex min-w-0 items-center gap-2 border-b border-white/[.08] pb-1.5 pr-11 sm:block sm:pb-2 sm:pr-36">
        <p className="min-w-0 flex-1 truncate text-[15px] font-black uppercase tracking-[-.015em] text-white sm:text-base">
          {team.nome}
        </p>
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? "Riprendi la partita" : "Metti in pausa"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-slate-950/72 text-sm font-black text-white shadow-md transition active:scale-95 sm:hidden"
        >
          <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
        </button>
      </div>

      <div className="grid grid-cols-[66px_minmax(0,1fr)_82px] items-center gap-1.5 pt-1 sm:grid-cols-[105px_minmax(0,560px)_125px] sm:justify-center sm:gap-4 sm:pt-1.5">
        <div className="space-y-1 border-r border-white/10 pr-1.5 text-center sm:pr-3">
          <Metric label="Record" value={formatNumber(snapshot.best)} />
          <Metric label="Gol" value={String(snapshot.goals)} accent />
        </div>

        <div className="min-w-0 text-center">
          <p className={`text-[8px] font-black uppercase tracking-[.18em] sm:text-[7px] ${warning ? "text-rose-100" : "text-white/52"}`}>
            Voto · vita
          </p>
          <div className="flex h-8 items-center justify-center gap-1 sm:h-10 sm:gap-2">
            {warning && <span aria-hidden="true" className={`life-warning-icon text-[1.25rem] leading-none sm:text-[1.75rem] ${critical ? "text-rose-300" : "text-amber-200"}`}>⚠</span>}
            <strong className={`min-w-[70px] text-center text-[2.1rem] font-black leading-none tracking-[-.04em] tabular-nums sm:min-w-[88px] sm:text-[2.25rem] ${critical ? "text-rose-200" : warning ? "text-amber-200" : "text-amber-300"}`}>
              {formatRating(snapshot.teamRating)}
            </strong>
            {warning && <span aria-hidden="true" className={`life-warning-icon text-[1.25rem] leading-none sm:text-[1.75rem] ${critical ? "text-rose-300" : "text-amber-200"}`}>⚠</span>}
            {warning && <span className="sr-only">Zona di pericolo</span>}
          </div>

          <div className="mx-auto grid w-full grid-cols-[26px_minmax(0,1fr)_40px] items-center gap-1.5 sm:grid-cols-[38px_minmax(0,1fr)_60px] sm:gap-2.5">
            <strong className="text-right text-sm font-black tabular-nums text-rose-100 sm:text-lg">62</strong>
            <div className={`relative h-[18px] rounded-full border bg-slate-950/72 shadow-[inset_0_1px_5px_rgba(0,0,0,.58)] sm:h-4 ${critical ? "life-bar-critical border-rose-100/75" : warning ? "border-amber-200/55" : "border-white/20"}`}>
              <span className={`absolute inset-y-0 left-0 rounded-full transition-[width,background] duration-300 ${critical ? "bg-gradient-to-r from-rose-700 to-rose-400" : warning ? "bg-gradient-to-r from-rose-500 to-amber-300" : "bg-gradient-to-r from-rose-500 via-amber-300 to-emerald-400"}`} style={{ width: `${ratingProgress}%` }} />
              <span className={`absolute -top-1 h-[calc(100%+8px)] w-1.5 -translate-x-1/2 rounded-full border bg-blue-950 transition-[left] duration-300 ${critical ? "border-rose-50 shadow-[0_0_12px_rgba(251,113,133,.9)]" : "border-white/90"}`} style={{ left: `${ratingProgress}%` }} />
            </div>
            <span className="text-left text-[5px] font-black uppercase leading-tight tracking-[.03em] text-emerald-100/70 sm:text-[7px]">Gol a <b className="block text-xs leading-none tabular-nums text-emerald-100 sm:text-base">{nextGoal}</b></span>
          </div>
          <p className={`mt-0.5 text-[6px] font-black uppercase tracking-[.12em] sm:text-[7px] ${critical ? "text-rose-200" : "text-white/45"}`}>
            {critical ? "Pericolo · sotto 62 termina la corsa" : "Sotto 62 termina la corsa"}
          </p>
        </div>

        <div className="space-y-1 border-l border-white/10 pl-1.5 text-center sm:pl-3">
          <div>
            <p className="text-[6px] font-black uppercase tracking-[.13em] text-amber-100/55 sm:text-[7px]">Punti</p>
            <strong key={Math.floor(snapshot.score / 250)} className="score-value-pop block truncate text-[1.35rem] font-black leading-none tabular-nums text-amber-300 sm:text-2xl">
              {formatNumber(snapshot.score)}
            </strong>
          </div>
          <Metric label="Metri" value={`${formatNumber(snapshot.distance)} m`} />
        </div>
      </div>

      <style jsx global>{`
        @keyframes life-critical-pulse { 0%,100% { transform:scaleY(1); } 50% { transform:scaleY(1.08); } }
        @keyframes warning-icon-pulse { 0%,100% { opacity:.78; transform:scale(.96); } 50% { opacity:1; transform:scale(1.08); } }
        @keyframes score-value-pop { 0% { opacity:.72; transform:translateY(2px) scale(.96); } 100% { opacity:1; transform:none; } }
        .life-bar-critical { animation:life-critical-pulse 1.8s ease-in-out infinite; will-change:transform; }
        .life-warning-icon { animation:warning-icon-pulse 1.8s ease-in-out infinite; }
        .score-value-pop { animation:score-value-pop 260ms ease-out both; }
        @media (prefers-reduced-motion:reduce) { .life-bar-critical,.life-warning-icon,.score-value-pop { animation:none; } }
      `}</style>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.1em] text-white/42 sm:text-[7px]">{label}</p><p className={`truncate text-[13px] font-black leading-none tabular-nums sm:text-sm ${accent ? "text-amber-300" : "text-white"}`}>{value}</p></div>;
}

function formatNumber(value: number) { return Math.round(value).toLocaleString("it-IT"); }
function formatRating(value: number) { return value.toLocaleString("it-IT", { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 }); }
