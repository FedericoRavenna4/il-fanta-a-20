"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TEAM_RATING_INITIAL,
  TEAM_RATING_THRESHOLD,
} from "@/lib/game/config";
import type { GameSnapshot, GameStatus, GameTeam } from "@/lib/game/types";
import FantaRunner from "./FantaRunner";
import GameHud from "./GameHud";
import GameOver from "./GameOver";
import GameOverlayLayer from "./GameOverlayLayer";
import TeamSelector from "./TeamSelector";

function createEmptySnapshot(best = 0): GameSnapshot {
  return {
    score: 0,
    best,
    multiplier: 1,
    teamRating: TEAM_RATING_INITIAL,
    threshold: TEAM_RATING_THRESHOLD,
    goals: 0,
    nextGoalThreshold: 66,
    protectionActive: true,
    protectionRemaining: 5,
    flowProgress: 0,
    speedLevel: 1,
    distance: 0,
    scenarioName: "Serie C",
    bonusesCollected: 0,
    malusesCollected: 0,
    message: "",
    gameOverReason: "",
    rafficaType: null,
    rafficaRemaining: 0,
    activePowerUps: [],
    presentation: null,
    bossRemaining: 0,
  };
}

export default function GameClient({
  teams,
  initialTeamSlug,
}: {
  teams: GameTeam[];
  initialTeamSlug?: string;
}) {
  const [selectorVersion, setSelectorVersion] = useState(0);
  const [team, setTeam] = useState<GameTeam | null>(null);
  const [initialSelectionAvailable, setInitialSelectionAvailable] = useState(Boolean(initialTeamSlug));
  const [status, setStatus] = useState<GameStatus>("selecting");
  const [runId, setRunId] = useState(0);
  const [best, setBest] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createEmptySnapshot());
  const [finalResult, setFinalResult] = useState<GameSnapshot | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalOpen = Boolean(team) && status !== "selecting";

  const selectTeam = useCallback((selectedTeam: GameTeam) => {
    const savedBest = readBest(selectedTeam.id);
    setTeam(selectedTeam);
    setBest(savedBest);
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot(savedBest));
    setAssetsReady(false);
    setInitialSelectionAvailable(false);
    setStatus("ready");
  }, []);

  const startGame = useCallback(() => {
    if (!assetsReady) return;
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot(best));
    setRunId((current) => current + 1);
    setStatus("running");
  }, [assetsReady, best]);

  const handleGameOver = useCallback((result: GameSnapshot) => {
    if (!team) return;
    const nextBest = Math.max(best, result.score);
    const completedResult = { ...result, best: nextBest };
    setIsNewRecord(result.score > best);
    setBest(nextBest);
    setSnapshot(completedResult);
    setFinalResult(completedResult);
    writeBest(team.id, nextBest);
    setStatus("gameOver");
  }, [best, team]);

  const returnToGameHome = useCallback((requireConfirmation: boolean) => {
    if (
      requireConfirmation &&
      (status === "running" || status === "paused") &&
      !window.confirm("Vuoi abbandonare la partita in corso?")
    ) return;

    setStatus("selecting");
    setTeam(null);
    setRunId((current) => current + 1);
    setBest(0);
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot());
    setAssetsReady(false);
    setSelectorVersion((current) => current + 1);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !assetsReady) return;
    const timer = window.setTimeout(startGame, 520);
    return () => window.clearTimeout(timer);
  }, [assetsReady, startGame, status]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && status === "running") setStatus("paused");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [status]);

  useEffect(() => {
    if (!modalOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      overscroll: root.style.overscrollBehavior,
      scrollBehavior: root.style.scrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      root.style.overscrollBehavior = previous.overscroll;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => { root.style.scrollBehavior = previous.scrollBehavior; });
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (status === "running") setStatus("paused");
      else returnToGameHome(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [modalOpen, returnToGameHome, status]);

  const gameModal = typeof document !== "undefined" && modalOpen && team
    ? createPortal(
        <div className="game-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-[max(.35rem,env(safe-area-inset-top))_max(.35rem,env(safe-area-inset-right))_max(.35rem,env(safe-area-inset-bottom))_max(.35rem,env(safe-area-inset-left))]">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Partita con ${team.nome}`}
            tabIndex={-1}
            className="game-modal-panel relative max-w-full overflow-hidden rounded-[1rem] border border-white/15 bg-[#020817] shadow-[0_35px_110px_rgba(2,8,23,.68),0_0_48px_rgba(56,189,248,.1)] outline-none sm:rounded-[1.6rem]"
            style={{ width: "min(97vw, calc((100dvh - 7rem) * 1.8), 1280px)" }}
          >
            <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5 sm:right-3 sm:top-3">
              {(status === "running" || status === "paused") && (
                <button
                  type="button"
                  onClick={() => setStatus((current) => current === "running" ? "paused" : current === "paused" ? "running" : current)}
                  className="min-h-11 rounded-full border border-white/18 bg-slate-950/90 px-4 text-[9px] font-black uppercase tracking-[.12em] text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {status === "paused" ? "Riprendi" : "Pausa"}
                </button>
              )}
              <button
                type="button"
                onClick={() => returnToGameHome(true)}
                aria-label="Chiudi il gioco e torna alla selezione"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-slate-950/90 text-xl font-light text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                ×
              </button>
            </div>

            <GameHud team={team} snapshot={snapshot} />

            <div className="relative overflow-hidden">
              <FantaRunner
                team={team}
                status={status}
                runId={runId}
                best={best}
                onSnapshot={setSnapshot}
                onGameOver={handleGameOver}
                onAssetsReady={setAssetsReady}
              />
              <GameOverlayLayer presentation={snapshot.presentation} snapshot={snapshot} />

              {status === "ready" && (
                <div className="game-ready-curtain pointer-events-none absolute inset-0 z-[9] flex items-center justify-center bg-[#020817]/88 backdrop-blur-sm">
                  <span className="text-[9px] font-black uppercase tracking-[.24em] text-sky-100/75">Preparazione del campo</span>
                </div>
              )}

              {status === "paused" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020817]/84 p-4 backdrop-blur-md">
                  <div className="text-center text-white">
                    <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Sessione sospesa</p>
                    <h2 className="mt-1 text-3xl font-black uppercase">Pausa</h2>
                    <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                      <button type="button" onClick={() => setStatus("running")} className="min-h-12 rounded-full bg-white px-7 text-[10px] font-black uppercase tracking-[.16em] text-blue-950">Riprendi</button>
                      <button type="button" onClick={() => returnToGameHome(true)} className="min-h-12 rounded-full border border-white/15 px-6 text-[10px] font-black uppercase tracking-[.14em] text-white/75">Torna alla selezione</button>
                    </div>
                  </div>
                </div>
              )}

              {status === "gameOver" && finalResult && (
                <GameOver team={team} result={finalResult} isNewRecord={isNewRecord} onRetry={startGame} onReturn={() => returnToGameHome(false)} />
              )}
            </div>
          </section>
          <style jsx global>{`
            @keyframes game-modal-backdrop-in { from { opacity:0; } to { opacity:1; } }
            @keyframes game-modal-panel-in { from { opacity:0; transform:translate3d(0,12px,0) scale(.975); } to { opacity:1; transform:none; } }
            @keyframes game-ready-reveal { 0%,55% { opacity:1; } 100% { opacity:0; } }
            .game-modal-backdrop { animation:game-modal-backdrop-in 260ms ease-out both; }
            .game-modal-panel { animation:game-modal-panel-in 420ms cubic-bezier(.2,.8,.2,1) both; }
            .game-ready-curtain { animation:game-ready-reveal 520ms ease-out both; }
            @media (prefers-reduced-motion:reduce) { .game-modal-backdrop,.game-modal-panel,.game-ready-curtain { animation-duration:1ms; } }
          `}</style>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <TeamSelector
        key={selectorVersion}
        teams={teams}
        initialTeamSlug={initialSelectionAvailable ? initialTeamSlug : undefined}
        onSelect={selectTeam}
      />
      {gameModal}
    </>
  );
}

function storageKey(teamId: number) { return `fanta-runner-best:${teamId}`; }

function readBest(teamId: number) {
  try {
    const value = Number(window.localStorage.getItem(storageKey(teamId)) ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  } catch { return 0; }
}

function writeBest(teamId: number, score: number) {
  try { window.localStorage.setItem(storageKey(teamId), String(score)); }
  catch { /* Il gioco resta utilizzabile se lo storage è bloccato. */ }
}
