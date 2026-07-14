"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  TEAM_RATING_INITIAL,
  TEAM_RATING_THRESHOLD,
} from "@/lib/game/config";
import type { GameSnapshot, GameStatus, GameTeam } from "@/lib/game/types";
import FantaRunner from "./FantaRunner";
import GameHud from "./GameHud";
import GameOver from "./GameOver";
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
  };
}

export default function GameClient({ teams }: { teams: GameTeam[] }) {
  const [team, setTeam] = useState<GameTeam | null>(null);
  const [status, setStatus] = useState<GameStatus>("selecting");
  const [runId, setRunId] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createEmptySnapshot());
  const [finalResult, setFinalResult] = useState<GameSnapshot | null>(null);

  const selectTeam = useCallback((selectedTeam: GameTeam) => {
    const savedBest = readBest(selectedTeam.id);
    setTeam(selectedTeam);
    setBest(savedBest);
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot(savedBest));
    setStatus("ready");
  }, []);

  const startGame = useCallback(() => {
    setIsNewRecord(false);
    setFinalResult(null);
    setSnapshot(createEmptySnapshot(best));
    setRunId((current) => current + 1);
    setStatus("running");
  }, [best]);

  const handleGameOver = useCallback(
    (result: GameSnapshot) => {
      if (!team) return;
      const nextBest = Math.max(best, result.score);
      const completedResult = { ...result, best: nextBest };
      setIsNewRecord(result.score > best);
      setBest(nextBest);
      setSnapshot(completedResult);
      setFinalResult(completedResult);
      writeBest(team.id, nextBest);
      setStatus("gameOver");
    },
    [best, team]
  );

  const returnToGameHome = useCallback(
    (requireConfirmation: boolean) => {
      if (
        requireConfirmation &&
        (status === "running" || status === "paused") &&
        !window.confirm("Vuoi abbandonare la partita in corso?")
      ) {
        return;
      }

      setStatus("selecting");
      setTeam(null);
      setRunId((current) => current + 1);
      setBest(0);
      setIsNewRecord(false);
      setFinalResult(null);
      setSnapshot(createEmptySnapshot());
    },
    [status]
  );

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && status === "running") setStatus("paused");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [status]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.code === "Space" || event.code === "ArrowUp") && status === "ready") {
        event.preventDefault();
        startGame();
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startGame, status]);

  if (!team || status === "selecting") {
    return <TeamSelector teams={teams} onSelect={selectTeam} />;
  }

  return (
    <section className="mx-auto max-w-6xl overflow-hidden rounded-[1.1rem] border border-slate-300/80 bg-[#020817] shadow-[0_34px_95px_rgba(15,23,42,0.24),0_0_45px_rgba(56,189,248,0.06)] ring-1 ring-white/80 sm:rounded-[2rem]">
      <GameHud
        team={team}
        snapshot={snapshot}
        paused={status === "paused"}
        canPause={status === "running" || status === "paused"}
        onPause={() =>
          setStatus((current) => {
            if (current === "running") return "paused";
            if (current === "paused") return "running";
            return current;
          })
        }
      />

      <div className="relative overflow-hidden">
        <FantaRunner
          team={team}
          status={status}
          runId={runId}
          best={best}
          onSnapshot={setSnapshot}
          onGameOver={handleGameOver}
        />

        {status === "ready" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020817]/78 p-2 backdrop-blur-sm sm:p-4">
            <div className="w-full max-w-md text-center text-white">
              <div className="mx-auto flex h-14 w-14 items-center justify-center sm:h-20 sm:w-20">
                <Image src={team.logo} alt={`Stemma ${team.nome}`} width={96} height={96} priority className="max-h-full max-w-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.45)]" />
              </div>
              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">{team.nome}</p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-4xl">Pronto alla corsa</h2>
              <p className="mx-auto mt-1 max-w-sm text-[9px] font-semibold leading-3 text-white/58 sm:hidden">
                Scorri verso l&apos;alto per saltare<br />
                Scorri verso il basso per abbassarti
              </p>
              <p className="mx-auto mt-2 hidden max-w-sm text-sm font-semibold leading-5 text-white/55 sm:block">
                Touch: sinistra per abbassarti, destra per saltare. Mouse: sinistro salta, destro abbassa. Tastiera: ↓, ↑ o Spazio.
              </p>
              <div className="mt-2 flex items-center justify-center gap-1.5 sm:mt-5 sm:gap-2">
                <button type="button" onClick={startGame} className="min-h-9 rounded-full bg-amber-300 px-4 text-[8px] font-black uppercase tracking-[0.12em] text-blue-950 transition hover:bg-amber-200 sm:min-h-12 sm:px-8 sm:text-[10px] sm:tracking-[0.16em]">Inizia la corsa</button>
                <button type="button" onClick={() => returnToGameHome(false)} className="min-h-9 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[8px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-white/10 sm:min-h-12 sm:px-6 sm:text-[10px] sm:tracking-[0.13em]">Cambia società</button>
              </div>
            </div>
          </div>
        )}

        {status === "paused" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020817]/82 p-4 backdrop-blur-md">
            <div className="text-center text-white">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">Sessione sospesa</p>
              <h2 className="mt-1 text-3xl font-black uppercase">Pausa</h2>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={() => setStatus("running")} className="min-h-12 rounded-full bg-white px-7 text-[10px] font-black uppercase tracking-[0.16em] text-blue-950">Riprendi</button>
                <button type="button" onClick={() => returnToGameHome(true)} className="min-h-12 rounded-full border border-white/15 px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">Torna alla selezione</button>
              </div>
            </div>
          </div>
        )}

        {status === "gameOver" && finalResult && (
          <GameOver team={team} result={finalResult} isNewRecord={isNewRecord} onRetry={startGame} onReturn={() => returnToGameHome(false)} />
        )}
      </div>
    </section>
  );
}

function storageKey(teamId: number) {
  return `fanta-runner-best:${teamId}`;
}

function readBest(teamId: number) {
  try {
    const value = Number(window.localStorage.getItem(storageKey(teamId)) ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  } catch {
    return 0;
  }
}

function writeBest(teamId: number, score: number) {
  try {
    window.localStorage.setItem(storageKey(teamId), String(score));
  } catch {
    // Il gioco resta utilizzabile anche se lo storage del browser è bloccato.
  }
}
