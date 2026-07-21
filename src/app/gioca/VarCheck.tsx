"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GAME_ASSETS } from "@/lib/game/assets";
import type { GameTeam } from "@/lib/game/types";
import type { VarVerdict } from "@/lib/game/progression";

export default function VarCheck({
  team,
  verdict,
  onComplete,
}: {
  team: GameTeam;
  verdict: VarVerdict;
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    const firstStepTimer = window.setTimeout(() => setAnalysisStep(1), 1800);
    const secondStepTimer = window.setTimeout(() => setAnalysisStep(2), 3500);
    const revealTimer = window.setTimeout(() => setRevealed(true), 5200);
    return () => {
      window.clearTimeout(firstStepTimer);
      window.clearTimeout(secondStepTimer);
      window.clearTimeout(revealTimer);
    };
  }, []);

  const overturned = verdict === "overturned";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020817]/88 p-4 text-white backdrop-blur-md">
      <section
        aria-live="assertive"
        aria-label="Controllo VAR in corso"
        className={`var-check-card relative w-full max-w-md overflow-hidden rounded-[1.5rem] border px-5 py-7 text-center shadow-[0_30px_90px_rgba(0,0,0,.58)] transition-colors duration-500 sm:px-8 sm:py-9 ${
          revealed
            ? overturned
              ? "border-emerald-300/30 bg-[linear-gradient(145deg,rgba(5,46,42,.98),rgba(2,15,32,.98))]"
              : "border-rose-300/30 bg-[linear-gradient(145deg,rgba(65,15,29,.98),rgba(2,15,32,.98))]"
            : "border-sky-200/20 bg-[linear-gradient(145deg,rgba(7,35,67,.98),rgba(2,15,32,.98))]"
        }`}
      >
        <span className="var-check-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
        <p className="text-[9px] font-black uppercase tracking-[.28em] text-sky-200/70">Decisione ufficiale</p>
        <div className="relative mx-auto mt-4 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
          <span className={`absolute inset-0 rounded-full border ${revealed ? overturned ? "border-emerald-300/30" : "border-rose-300/30" : "var-check-ring border-sky-300/35"}`} />
          <Image
            src={GAME_ASSETS.obstacles.var}
            alt="VAR"
            width={110}
            height={160}
            unoptimized
            priority
            className="h-[78px] w-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.5)] sm:h-[90px]"
          />
        </div>
        <p className="mt-4 truncate text-xs font-black uppercase tracking-[.12em] text-white/55">{team.nome}</p>
        <h2 className="mt-1 text-2xl font-black uppercase tracking-[-.035em] sm:text-3xl">
          {revealed
            ? overturned
              ? "Retrocessione annullata"
              : "Retrocessione convalidata"
            : "CHECK VAR"}
        </h2>
        <p className={`mx-auto mt-2 min-h-10 max-w-xs text-sm font-semibold leading-relaxed transition-opacity duration-300 ${revealed ? "opacity-80" : "opacity-55"}`}>
          {revealed
            ? overturned
              ? "La decisione cambia: categoria mantenuta e salvezza registrata."
              : "La decisione è confermata: la retrocessione resta valida."
            : analysisStep === 0
              ? "La sala VAR sta ricostruendo l'azione."
              : analysisStep === 1
                ? "Controllo della decisione sul campo."
                : "Verdetto in arrivo."}
        </p>
        {!revealed && (
          <div className="mx-auto mt-5 flex w-20 justify-between" aria-hidden="true">
            <i className="var-check-dot h-1.5 w-1.5 rounded-full bg-sky-200" />
            <i className="var-check-dot h-1.5 w-1.5 rounded-full bg-sky-200 [animation-delay:140ms]" />
            <i className="var-check-dot h-1.5 w-1.5 rounded-full bg-sky-200 [animation-delay:280ms]" />
          </div>
        )}
        {revealed && (
          <button
            type="button"
            onClick={onComplete}
            className={`mt-5 min-h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-[.18em] text-slate-950 shadow-[0_12px_30px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${overturned ? "bg-emerald-300 hover:bg-emerald-200" : "bg-rose-300 hover:bg-rose-200"}`}
          >
            Prosegui
          </button>
        )}
      </section>
      <style jsx>{`
        @keyframes var-scan { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: .8; } 88% { opacity: .8; } 100% { transform: translateY(25rem); opacity: 0; } }
        @keyframes var-ring { 0%,100% { transform: scale(.92); opacity: .35; } 50% { transform: scale(1.08); opacity: .9; } }
        @keyframes var-dot { 0%,100% { transform: translateY(0); opacity: .3; } 50% { transform: translateY(-5px); opacity: 1; } }
        .var-check-card { animation: var-card-in 380ms cubic-bezier(.2,.8,.2,1) both; }
        .var-check-scan { animation: var-scan 2.1s linear infinite; }
        .var-check-ring { animation: var-ring 1.65s ease-in-out infinite; }
        .var-check-dot { animation: var-dot 1.05s ease-in-out infinite; }
        @keyframes var-card-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .var-check-card,.var-check-scan,.var-check-ring,.var-check-dot { animation-duration: 1ms; animation-iteration-count: 1; } }
      `}</style>
    </div>
  );
}
