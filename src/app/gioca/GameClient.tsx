"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TEAM_RATING_INITIAL,
  TEAM_RATING_THRESHOLD,
} from "@/lib/game/config";
import {
  GAMEPLAY_TIPS,
  LOADING_GUIDES,
  pickGameplayTip,
  pickLoadingGuide,
} from "@/lib/game/content";
import type { GameSnapshot, GameStatus, GameTeam } from "@/lib/game/types";
import {
  readPersonalDistanceRecord,
  writePersonalDistanceRecord,
} from "@/lib/game/records";
import {
  LEVEL_RULES,
  applyLevelResult,
  createDefaultClubProgress,
  readArcadeProgress,
  resolveLevelOutcome,
  resolveVarOutcome,
  writeClubProgress,
  type ClubProgress,
  type GameLevel,
  type LevelResolution,
  type VarVerdict,
} from "@/lib/game/progression";
import FantaRunner from "./FantaRunner";
import GameHud from "./GameHud";
import GameOver from "./GameOver";
import GameOverlayLayer from "./GameOverlayLayer";
import TeamSelector from "./TeamSelector";
import VarCheck from "./VarCheck";

type PendingVarReview = {
  result: GameSnapshot;
  verdict: VarVerdict;
  relegation: LevelResolution;
};

function createEmptySnapshot(best = 0, personalRecord = 0): GameSnapshot {
  return {
    score: 0,
    best,
    personalRecord,
    recordCelebrationDistance: 0,
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
  const [personalRecord, setPersonalRecord] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingTip, setLoadingTip] = useState(LOADING_GUIDES[0]);
  const [gameplayTip, setGameplayTip] = useState<string>(GAMEPLAY_TIPS[0]);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createEmptySnapshot());
  const [finalResult, setFinalResult] = useState<GameSnapshot | null>(null);
  const [progressByClub, setProgressByClub] = useState<Record<string, ClubProgress>>({});
  const [clubProgress, setClubProgress] = useState<ClubProgress>(() => createDefaultClubProgress());
  const [activeLevel, setActiveLevel] = useState<GameLevel>(1);
  const [finalResolution, setFinalResolution] = useState<LevelResolution | null>(null);
  const [pendingVarReview, setPendingVarReview] = useState<PendingVarReview | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const selectionRootRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const startTransitionTimerRef = useRef<number | null>(null);
  const modalOpen = Boolean(team) && status !== "selecting";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgressByClub(readArcadeProgress());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectTeam = useCallback((selectedTeam: GameTeam) => {
    const savedBest = readBest(selectedTeam.id);
    const savedPersonalRecord = readPersonalDistanceRecord();
    const savedProgress = readArcadeProgress()[String(selectedTeam.id)] ??
      createDefaultClubProgress();
    setTeam(selectedTeam);
    setClubProgress(savedProgress);
    setActiveLevel(savedProgress.currentLevel);
    setBest(savedBest);
    setPersonalRecord(savedPersonalRecord);
    setIsNewRecord(false);
    setFinalResult(null);
    setFinalResolution(null);
    setPendingVarReview(null);
    setSnapshot(createEmptySnapshot(savedBest, savedPersonalRecord));
    setAssetsReady(false);
    setLoadProgress(0);
    setLoadingTip(pickLoadingGuide());
    setGameplayTip(pickGameplayTip());
    setInitialSelectionAvailable(false);
    setRunId((current) => current + 1);
    setStatus("ready");
  }, []);

  const startGame = useCallback(() => {
    if (!assetsReady) return;
    if (startTransitionTimerRef.current !== null) {
      window.clearTimeout(startTransitionTimerRef.current);
    }
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot(best, personalRecord));
    setStatus("starting");
    const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 650;
    startTransitionTimerRef.current = window.setTimeout(() => {
      startTransitionTimerRef.current = null;
      setStatus("running");
    }, transitionDuration);
  }, [assetsReady, best, personalRecord]);

  const commitGameOver = useCallback((result: GameSnapshot, resolutionOverride?: LevelResolution) => {
    if (!team) return;
    const nextBest = Math.max(best, result.score);
    const nextPersonalRecord = Math.max(personalRecord, result.distance);
    const levelResult = applyLevelResult(
      clubProgress,
      activeLevel,
      result.distance,
      resolutionOverride
    );
    const completedResult = {
      ...result,
      best: nextBest,
      personalRecord: nextPersonalRecord,
      recordCelebrationDistance: 0,
    };
    setIsNewRecord(result.distance > personalRecord);
    setBest(nextBest);
    setPersonalRecord(nextPersonalRecord);
    setSnapshot(completedResult);
    setFinalResult(completedResult);
    setFinalResolution(levelResult.resolution);
    setClubProgress(levelResult.progress);
    setProgressByClub((current) => ({
      ...current,
      [String(team.id)]: levelResult.progress,
    }));
    writeBest(team.id, nextBest);
    writePersonalDistanceRecord(nextPersonalRecord);
    writeClubProgress(team.id, levelResult.progress);
    triggerOutcomeHaptic(levelResult.resolution.outcome);
    setPendingVarReview(null);
    setStatus("gameOver");
  }, [activeLevel, best, clubProgress, personalRecord, team]);

  const handleGameOver = useCallback((result: GameSnapshot) => {
    const outcome = resolveLevelOutcome(activeLevel, result.distance);
    if (outcome.outcome === "relegated") {
      setPendingVarReview({
        result,
        relegation: outcome,
        verdict: Math.random() < 0.5 ? "overturned" : "validated",
      });
      setStatus("varCheck");
      return;
    }
    commitGameOver(result);
  }, [activeLevel, commitGameOver]);

  const completeVarReview = useCallback(() => {
    if (!pendingVarReview) return;
    commitGameOver(
      pendingVarReview.result,
      resolveVarOutcome(pendingVarReview.relegation, pendingVarReview.verdict)
    );
  }, [commitGameOver, pendingVarReview]);

  const prepareNextRun = useCallback(() => {
    setActiveLevel(clubProgress.currentLevel);
    setAssetsReady(false);
    setLoadProgress(0);
    setLoadingTip(pickLoadingGuide());
    setGameplayTip(pickGameplayTip());
    setFinalResult(null);
    setFinalResolution(null);
    setPendingVarReview(null);
    setSnapshot(createEmptySnapshot(best, personalRecord));
    setRunId((current) => current + 1);
    setStatus("ready");
  }, [best, clubProgress.currentLevel, personalRecord]);

  const returnToGameHome = useCallback((requireConfirmation: boolean) => {
    if (
      requireConfirmation &&
      (status === "running" || status === "paused") &&
      !window.confirm("Vuoi abbandonare la partita in corso?")
    ) return;

    if (startTransitionTimerRef.current !== null) {
      window.clearTimeout(startTransitionTimerRef.current);
      startTransitionTimerRef.current = null;
    }

    setStatus("selecting");
    setTeam(null);
    setRunId((current) => current + 1);
    setBest(0);
    setPersonalRecord(0);
    setIsNewRecord(false);
    setFinalResult(null);
    setFinalResolution(null);
    setPendingVarReview(null);
    setSnapshot(createEmptySnapshot());
    setAssetsReady(false);
    setLoadProgress(0);
    setSelectorVersion((current) => current + 1);
  }, [status]);

  useEffect(() => () => {
    if (startTransitionTimerRef.current !== null) {
      window.clearTimeout(startTransitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (status !== "ready" || !assetsReady) return;
    const timer = window.setTimeout(startGame, 4200);
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
    const selectionRoot = selectionRootRef.current;
    if (!selectionRoot || !modalOpen) return;
    selectionRoot.inert = true;
    selectionRoot.setAttribute("aria-hidden", "true");
    return () => {
      selectionRoot.inert = false;
      selectionRoot.removeAttribute("aria-hidden");
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
        <div className="game-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-[#020817] p-[max(.35rem,env(safe-area-inset-top))_max(.35rem,env(safe-area-inset-right))_max(.35rem,env(safe-area-inset-bottom))_max(.35rem,env(safe-area-inset-left))]">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Partita con ${team.nome}`}
            tabIndex={-1}
            className="game-modal-panel relative max-w-full overflow-hidden rounded-[1rem] border border-white/15 bg-[linear-gradient(180deg,#06162d,#020817)] shadow-[0_35px_110px_rgba(2,8,23,.68),0_0_48px_rgba(56,189,248,.1)] outline-none max-sm:flex max-sm:flex-col sm:rounded-[1.6rem]"
          >
            <div className="absolute right-3 top-3 z-30 hidden items-center gap-1.5 sm:flex lg:right-2 lg:top-2">
              {(status === "running" || status === "paused") && (
                <button
                  type="button"
                  onClick={() => setStatus((current) => current === "running" ? "paused" : current === "paused" ? "running" : current)}
                  className="min-h-11 rounded-full border border-white/18 bg-slate-950/90 px-4 text-[9px] font-black uppercase tracking-[.12em] text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-h-10"
                >
                  {status === "paused" ? "Riprendi" : "Pausa"}
                </button>
              )}
              <button
                type="button"
                onClick={() => returnToGameHome(true)}
                aria-label="Chiudi il gioco e torna alla selezione"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-slate-950/90 text-xl font-light text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:h-10 lg:w-10"
              >
                ×
              </button>
            </div>

            <div
              className="absolute right-0 top-0 z-30 hidden items-center justify-end gap-1.5 pr-[max(.4rem,env(safe-area-inset-right))] pt-[max(.4rem,env(safe-area-inset-top))] max-sm:flex"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {(status === "running" || status === "paused") ? (
                <button
                  type="button"
                  onClick={() => setStatus((current) => current === "running" ? "paused" : current === "paused" ? "running" : current)}
                  aria-label={status === "paused" ? "Riprendi la partita" : "Metti in pausa"}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-slate-950/90 text-[20px] font-black leading-none text-white shadow-lg transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden="true">{status === "paused" ? "▶" : "Ⅱ"}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => returnToGameHome(true)}
                aria-label="Chiudi il gioco e torna alla selezione"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-slate-950/90 text-[21px] font-light leading-none text-white shadow-lg transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                ×
              </button>
            </div>

            <GameHud
              team={team}
              snapshot={snapshot}
              level={activeLevel}
            />

            <div className="relative overflow-hidden max-sm:flex max-sm:flex-1 max-sm:items-center max-sm:bg-[radial-gradient(ellipse_at_center,rgba(14,55,92,.38),transparent_70%)]">
              <div className="relative w-full overflow-hidden max-sm:h-full">
                <FantaRunner
                team={team}
                level={activeLevel}
                status={status}
                runId={runId}
                best={best}
                distanceRecord={personalRecord}
                onSnapshot={setSnapshot}
                onGameOver={handleGameOver}
                onAssetsReady={setAssetsReady}
                onLoadProgress={setLoadProgress}
              />
                <GameOverlayLayer presentation={snapshot.presentation} snapshot={snapshot} />

                {status === "paused" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#020817]/84 p-4 backdrop-blur-md lg:p-2">
                  <div className="max-h-full w-full max-w-sm overflow-y-auto text-center text-white lg:rounded-2xl lg:border lg:border-white/10 lg:bg-slate-950/35 lg:p-4">
                    <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Sessione sospesa</p>
                    <h2 className="mt-1 text-3xl font-black uppercase">Pausa</h2>
                    <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row lg:mt-4">
                      <button type="button" onClick={() => setStatus("running")} className="min-h-12 rounded-full bg-white px-7 text-[10px] font-black uppercase tracking-[.16em] text-blue-950">Riprendi</button>
                      <button type="button" onClick={() => returnToGameHome(true)} className="min-h-12 rounded-full border border-white/15 px-6 text-[10px] font-black uppercase tracking-[.14em] text-white/75">Esci</button>
                    </div>
                  </div>
                </div>
              )}

                {status === "gameOver" && finalResult && (
                <GameOver
                  team={team}
                  result={finalResult}
                  isNewRecord={isNewRecord}
                  playedLevel={activeLevel}
                  progress={clubProgress}
                  resolution={finalResolution}
                  onRetry={prepareNextRun}
                  onReturn={() => returnToGameHome(false)}
                />
                )}

                {status === "varCheck" && pendingVarReview && (
                  <VarCheck
                    team={team}
                    verdict={pendingVarReview.verdict}
                    onComplete={completeVarReview}
                  />
                )}
              </div>
            </div>

            {(status === "ready" || status === "starting") && (
              <div className={`game-loading-screen absolute inset-0 z-40 grid grid-rows-[auto_1fr_auto] bg-[radial-gradient(circle_at_50%_36%,#174d7b_0%,#082341_34%,#020817_78%)] px-4 py-[max(.8rem,env(safe-area-inset-top))] text-center text-white sm:px-8 sm:py-6 ${status === "starting" ? "game-loading-screen-out" : ""}`}>
                <header className="mx-auto flex w-full max-w-md items-center gap-3 text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
                    <Image src={team.logo} alt="" width={112} height={112} unoptimized priority className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,.45)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[8px] font-black uppercase tracking-[.18em] text-sky-200/65">{team.nome}</p>
                        <h2 className="text-sm font-black uppercase tracking-[-.02em] sm:text-base">
                          Livello {activeLevel} · {LEVEL_RULES[activeLevel].name}
                        </h2>
                      </div>
                      <span className="text-[10px] font-black tabular-nums text-white/65">{Math.round(loadProgress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(loadProgress * 100)}>
                  <span className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300 transition-[width] duration-200" style={{ width: `${Math.max(4, loadProgress * 100)}%` }} />
                    </div>
                  </div>
                </header>
                <article className="relative mx-auto flex w-full max-w-[290px] self-center flex-col items-center rounded-[1.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,50,84,.72),rgba(2,8,23,.5))] px-4 py-3 shadow-[0_22px_55px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.08)] sm:max-w-sm sm:px-6 sm:py-5">
                  <p className="text-[7px] font-black uppercase tracking-[.23em] text-amber-300/75">Guida rapida</p>
                  <div className="mt-2 flex h-24 w-32 items-center justify-center sm:h-36 sm:w-48">
                    <Image src={loadingTip.image} alt="" width={320} height={240} unoptimized priority className="max-h-full max-w-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,.48)]" />
                  </div>
                  <h3 className="mt-1 text-base font-black uppercase tracking-[-.025em] sm:text-xl">{loadingTip.title}</h3>
                  <p className="mt-1.5 text-[15px] font-semibold leading-[1.45] text-white/76 sm:text-base">“{loadingTip.text}”</p>
                  <div className="mt-3 w-full border-t border-white/10 pt-2.5">
                    <p className="text-[7px] font-black uppercase tracking-[.2em] text-sky-200/65">Suggerimento</p>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold leading-[1.5] text-white/72 sm:text-[15px]">{gameplayTip}</p>
                  </div>
                </article>
                <section className="mx-auto w-full max-w-xl rounded-xl border border-white/10 bg-slate-950/42 px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:px-4 sm:py-3">
                  <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[.22em] text-sky-100">Controlli</p>
                  <div className="hidden grid-cols-4 gap-2 sm:grid">
                    <div className="lg:hidden"><ControlHint icon="L" label="Mouse sinistro" action="Salta" /></div>
                    <div className="lg:hidden"><ControlHint icon="R" label="Mouse destro" action="Abbassati" /></div>
                    <div className="hidden lg:block"><MouseControlHint side="left" label="Mouse sinistro" action="Salta" /></div>
                    <div className="hidden lg:block"><MouseControlHint side="right" label="Mouse destro" action="Abbassati" /></div>
                    <ControlHint icon="↑" label="Freccia su" action="Salta" />
                    <ControlHint icon="↓" label="Freccia giù" action="Abbassati" />
                  </div>
                  <div className="mx-auto w-full max-w-[250px] sm:hidden">
                    <MobileJumpHint />
                  </div>
                </section>
              </div>
            )}
          </section>
          <style jsx global>{`
            @keyframes game-modal-backdrop-in { from { opacity:0; } to { opacity:1; } }
            @keyframes game-modal-panel-in { from { opacity:0; transform:translate3d(0,12px,0) scale(.975); } to { opacity:1; transform:none; } }
            .game-modal-backdrop { animation:game-modal-backdrop-in 260ms ease-out both; }
            .game-modal-panel {
              width:min(97vw,calc((100dvh - 7rem) * 1.8),1280px);
              animation:game-modal-panel-in 420ms cubic-bezier(.2,.8,.2,1) both;
            }
            .game-loading-screen {
              opacity:1;
              transform:scale(1);
              transition:opacity 650ms cubic-bezier(.4,0,.2,1),transform 650ms cubic-bezier(.2,.8,.2,1);
              will-change:opacity,transform;
            }
            .game-loading-screen-out {
              opacity:0;
              transform:scale(1.012);
              pointer-events:none;
            }
            @media (max-width:639px) {
              .game-modal-panel {
                width:min(calc(100vw - .7rem),calc((100dvh - .7rem) * 9 / 16));
                height:min(calc(100dvh - .7rem),calc((100vw - .7rem) * 16 / 9));
              }
            }
            @media (prefers-reduced-motion:reduce) { .game-modal-backdrop,.game-modal-panel { animation-duration:1ms; } .game-loading-screen { transition-duration:1ms; } }
          `}</style>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div ref={selectionRootRef}>
        <TeamSelector
          key={selectorVersion}
          teams={teams}
          initialTeamSlug={initialSelectionAvailable ? initialTeamSlug : undefined}
          progressByClub={progressByClub}
          keyboardEnabled={!modalOpen}
          onSelect={selectTeam}
        />
      </div>
      {gameModal}
    </>
  );
}

function ControlHint({ icon, label, action }: { icon: string; label: string; action: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[.12] bg-white/[.055] px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-100/35 bg-sky-950/80 text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-bold text-white/65">{label}</span>
        <span className="block text-[10px] font-black uppercase tracking-[.07em] text-white">{action}</span>
      </span>
    </div>
  );
}

function MouseControlHint({ side, label, action }: { side: "left" | "right"; label: string; action: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[.12] bg-white/[.055] px-3 py-2.5">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-100/35 bg-sky-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]" aria-hidden="true">
        <svg viewBox="0 0 28 38" className="h-7 w-6" fill="none">
          <path d="M3 14C3 6.8 7.4 2 14 2s11 4.8 11 12v10c0 7.2-4.4 12-11 12S3 31.2 3 24V14Z" className="stroke-white/80" strokeWidth="2" />
          <path d="M14 3v12M4 14h20" className="stroke-white/30" strokeWidth="1.5" />
          <path d={side === "left" ? "M4.5 13.5V12C4.5 6.7 8 3.5 13.2 3.5v10Z" : "M14.8 3.5C20 3.5 23.5 6.7 23.5 12v1.5h-8.7Z"} className="fill-sky-300" />
        </svg>
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[9px] font-bold text-white/65">{label}</span>
        <span className="block text-[10px] font-black uppercase tracking-[.07em] text-white">{action}</span>
      </span>
    </div>
  );
}

function MobileJumpHint() {
  return (
    <div className="flex min-w-0 items-center justify-center gap-3 rounded-lg border border-sky-200/20 bg-sky-300/[.07] px-3 py-2">
      <span className="relative flex h-11 w-12 shrink-0 items-end justify-center" aria-hidden="true">
        <span className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-gradient-to-t from-sky-300 to-transparent" />
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-sky-200" />
        <svg viewBox="0 0 48 48" className="h-9 w-9 text-white drop-shadow-[0_5px_10px_rgba(14,165,233,.35)]" fill="none">
          <circle cx="24" cy="13" r="7" className="stroke-sky-300/45" strokeWidth="2" />
          <circle cx="24" cy="13" r="11" className="stroke-sky-300/20" strokeWidth="2" />
          <path d="M22 37V14a3 3 0 0 1 6 0v11-3a3 3 0 0 1 6 0v3-1a3 3 0 0 1 6 0v7c0 8-5 13-13 13h-2c-4 0-7-2-9-5l-5-8a3.2 3.2 0 0 1 5-4l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-left text-[12px] font-black uppercase leading-tight tracking-[.04em] text-white">Tocca lo schermo<br /><span className="text-sky-200">per saltare</span></span>
    </div>
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

function triggerOutcomeHaptic(outcome: LevelResolution["outcome"]) {
  if (
    typeof window === "undefined" ||
    !window.matchMedia("(max-width: 639px)").matches ||
    typeof navigator.vibrate !== "function"
  ) return;
  if (outcome === "promoted") navigator.vibrate([12, 28, 20]);
  else if (outcome === "relegated") navigator.vibrate([32, 35, 42]);
}
