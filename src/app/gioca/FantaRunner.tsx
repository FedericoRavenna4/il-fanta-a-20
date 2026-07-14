"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EVENT_DEFINITIONS,
  CROUCH_DURATION_MS,
  DIFFICULTY_CONFIG,
  FLOW_NEW_SCENARIO,
  FLOW_PERFECT_OBSTACLE,
  FLOW_PROGRESS_PER_SECOND,
  FLOW_RATING_REWARD,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  GROUND_Y,
  INITIAL_PROTECTION_SECONDS,
  JUMP_FORCE,
  GOAL_RATING_STEP,
  GOAL_THRESHOLD_COMBO_BONUS,
  GOAL_THRESHOLD_SCORE_BONUS,
  PLAYER_SIZE,
  PLAYER_X,
  SCENARIO_DURATION_SECONDS,
  SPEED_CONFIG,
  TEAM_RATING_INITIAL,
  TEAM_RATING_THRESHOLD,
} from "@/lib/game/config";
import { createSpawnDecision, getSafeSpawnInterval } from "@/lib/game/generator";
import { getScenarioState } from "@/lib/game/scenarios";
import type {
  EventKind,
  GameScenario,
  GameSnapshot,
  GameStatus,
  GameTeam,
  GroundPit,
  PhysicalObstacleKind,
  RunnerEntity,
} from "@/lib/game/types";

type Runtime = {
  playerX: number;
  playerY: number;
  velocityY: number;
  horizontalVelocity: number;
  grounded: boolean;
  blockedObstacleId: number | null;
  entities: RunnerEntity[];
  pits: GroundPit[];
  nextEntityId: number;
  spawnTimer: number;
  elapsed: number;
  score: number;
  multiplier: number;
  teamRating: number;
  distance: number;
  bonusesCollected: number;
  malusesCollected: number;
  crouchUntil: number;
  protectionAvailable: boolean;
  protectionEndNotified: boolean;
  flowProgress: number;
  lastScenarioIndex: number;
  maxGoalsReached: number;
  goalCelebrationUntil: number;
  goalCelebrationGoals: number;
  message: string;
  messageTone: "bonus" | "malus" | null;
  messageUntil: number;
  effect: "bonus" | "malus" | "jump" | "hit" | "goal" | null;
  effectUntil: number;
  gameOverReason: string;
  lastFrame: number;
  lastHudUpdate: number;
  finished: boolean;
};

const PLAYER_GROUND_Y = GROUND_Y - PLAYER_SIZE;

function createRuntime(): Runtime {
  return {
    playerX: PLAYER_X,
    playerY: PLAYER_GROUND_Y,
    velocityY: 0,
    horizontalVelocity: 0,
    grounded: true,
    blockedObstacleId: null,
    entities: [],
    pits: [],
    nextEntityId: 1,
    spawnTimer: 1.05,
    elapsed: 0,
    score: 0,
    multiplier: 1,
    teamRating: TEAM_RATING_INITIAL,
    distance: 0,
    bonusesCollected: 0,
    malusesCollected: 0,
    crouchUntil: 0,
    protectionAvailable: true,
    protectionEndNotified: false,
    flowProgress: 0,
    lastScenarioIndex: 0,
    maxGoalsReached: 0,
    goalCelebrationUntil: 0,
    goalCelebrationGoals: 0,
    message: "",
    messageTone: null,
    messageUntil: 0,
    effect: null,
    effectUntil: 0,
    gameOverReason: "",
    lastFrame: 0,
    lastHudUpdate: 0,
    finished: false,
  };
}

export default function FantaRunner({
  team,
  status,
  runId,
  best,
  onSnapshot,
  onGameOver,
}: {
  team: GameTeam;
  status: GameStatus;
  runId: number;
  best: number;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onGameOver: (snapshot: GameSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(createRuntime());
  const logoRef = useRef<HTMLImageElement | null>(null);
  const statusRef = useRef(status);
  const bestRef = useRef(best);
  const reducedMotionRef = useRef(false);
  const touchGestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    triggered: false,
  });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.src = team.logo;
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas || statusRef.current === "running") return;
      const context = prepareCanvas(canvas);
      drawGame(context, runtimeRef.current, image, performance.now(), reducedMotionRef.current);
    };
    logoRef.current = image;
    return () => {
      image.onload = null;
      logoRef.current = null;
    };
  }, [team.logo]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    runtimeRef.current = createRuntime();
    onSnapshot(toSnapshot(runtimeRef.current, bestRef.current, 0));
  }, [onSnapshot, runId]);

  const jump = useCallback(() => {
    if (statusRef.current !== "running") return;
    const runtime = runtimeRef.current;
    if (runtime.grounded) {
      runtime.crouchUntil = 0;
      runtime.grounded = false;
      runtime.blockedObstacleId = null;
      runtime.velocityY = JUMP_FORCE;
      runtime.effect = "jump";
      runtime.effectUntil = performance.now() + 360;
    }
  }, []);

  const duck = useCallback(() => {
    if (statusRef.current !== "running") return;
    const runtime = runtimeRef.current;
    if (runtime.grounded) {
      runtime.crouchUntil = performance.now() + CROUCH_DURATION_MS;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (statusRef.current !== "running") return;
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        duck();
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [duck, jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "running") return;

    let animationFrame = 0;
    const runtime = runtimeRef.current;
    runtime.lastFrame = 0;

    const frame = (time: number) => {
      if (statusRef.current !== "running") return;
      const context = prepareCanvas(canvas);
      const delta = runtime.lastFrame
        ? Math.min((time - runtime.lastFrame) / 1000, 0.035)
        : 0;
      runtime.lastFrame = time;

      updateRuntime(runtime, delta, time);
      drawGame(context, runtime, logoRef.current, time, reducedMotionRef.current);

      if (!runtime.finished && time - runtime.lastHudUpdate >= 90) {
        runtime.lastHudUpdate = time;
        onSnapshot(toSnapshot(runtime, best, time));
      }

      if (runtime.finished) {
        const finalSnapshot = toSnapshot(runtime, best, time);
        onSnapshot(finalSnapshot);
        onGameOver(finalSnapshot);
        return;
      }

      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [best, onGameOver, onSnapshot, runId, status]);

  useEffect(() => {
    if (status === "running") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = prepareCanvas(canvas);
    drawGame(
      context,
      runtimeRef.current,
      logoRef.current,
      performance.now(),
      reducedMotionRef.current
    );
  }, [status, team.logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      if (statusRef.current === "running") return;
      const context = prepareCanvas(canvas);
      drawGame(
        context,
        runtimeRef.current,
        logoRef.current,
        performance.now(),
        reducedMotionRef.current
      );
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") {
          event.preventDefault();
          if (event.button === 0) jump();
          if (event.button === 2) duck();
          return;
        }

        if (!window.matchMedia("(max-width: 639px)").matches) {
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX - bounds.left < bounds.width / 2) duck();
          else jump();
          return;
        }

        event.preventDefault();
        touchGestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          triggered: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const gesture = touchGestureRef.current;
        if (
          event.pointerType === "mouse" ||
          gesture.pointerId !== event.pointerId ||
          gesture.triggered
        ) {
          return;
        }

        event.preventDefault();
        const deltaX = event.clientX - gesture.startX;
        const deltaY = event.clientY - gesture.startY;
        const minimumDistance = 28;

        if (
          Math.abs(deltaY) < minimumDistance ||
          Math.abs(deltaY) <= Math.abs(deltaX) * 1.15
        ) {
          return;
        }

        gesture.triggered = true;
        if (deltaY < 0) jump();
        else duck();
      }}
      onPointerUp={(event) => {
        if (touchGestureRef.current.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        touchGestureRef.current.pointerId = -1;
      }}
      onPointerCancel={(event) => {
        if (touchGestureRef.current.pointerId !== event.pointerId) return;
        touchGestureRef.current.pointerId = -1;
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`Campo di gioco. Su touch scorri verso l'alto per saltare e verso il basso per abbassarti. Da desktop usa il click sinistro per saltare e il click destro per abbassarti con ${team.nome}.`}
      className="block aspect-[9/5] w-full touch-none bg-[#020817] outline-none"
    />
  );
}

function prepareCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(rect.height * pixelRatio));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D non disponibile");
  context.setTransform(pixelWidth / GAME_WIDTH, 0, 0, pixelHeight / GAME_HEIGHT, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

function updateRuntime(runtime: Runtime, delta: number, time: number) {
  if (delta <= 0) return;

  runtime.elapsed += delta;
  if (time >= runtime.messageUntil) {
    runtime.message = "";
    runtime.messageTone = null;
  }
  if (time >= runtime.effectUntil) runtime.effect = null;

  if (
    runtime.elapsed >= INITIAL_PROTECTION_SECONDS &&
    !runtime.protectionEndNotified
  ) {
    runtime.protectionEndNotified = true;
    runtime.protectionAvailable = false;
  }

  const difficulty = getDifficultyProgress(runtime);
  const speed = getRunSpeed(difficulty);

  const wasBlocked = runtime.blockedObstacleId !== null;
  runtime.playerX += runtime.horizontalVelocity * delta;
  runtime.horizontalVelocity *= Math.max(0, 1 - delta * 7.5);
  if (!wasBlocked) {
    runtime.playerX +=
      (PLAYER_X - runtime.playerX) * Math.min(1, delta * 4.2);
  }
  runtime.playerX = Math.min(PLAYER_X, runtime.playerX);
  runtime.blockedObstacleId = null;

  const previousPlayerY = runtime.playerY;
  runtime.grounded = false;
  runtime.velocityY += GRAVITY * delta;
  runtime.playerY = Math.min(
    PLAYER_GROUND_Y,
    runtime.playerY + runtime.velocityY * delta
  );
  if (runtime.playerY >= PLAYER_GROUND_Y) {
    runtime.playerY = PLAYER_GROUND_Y;
    runtime.velocityY = 0;
    runtime.grounded = true;
  }

  runtime.distance += speed * delta * 0.01;
  runtime.flowProgress += FLOW_PROGRESS_PER_SECOND * delta;

  const scenarioIndex = Math.floor(runtime.elapsed / SCENARIO_DURATION_SECONDS);
  if (scenarioIndex > runtime.lastScenarioIndex) {
    runtime.lastScenarioIndex = scenarioIndex;
    runtime.flowProgress += FLOW_NEW_SCENARIO;
    runtime.score += 220 * Math.max(1, runtime.multiplier);
  }

  if (runtime.flowProgress >= 100) {
    runtime.flowProgress -= 100;
    addTeamRating(runtime, FLOW_RATING_REWARD, time);
  }
  runtime.score +=
    delta * (36 + speed * 0.04 + getSpeedLevel(difficulty) * 4) * runtime.multiplier;
  runtime.spawnTimer -= delta;

  if (runtime.spawnTimer <= 0) {
    const sequenceDelay = spawnNext(runtime, speed, difficulty);
    runtime.spawnTimer =
      getSafeSpawnInterval(speed, difficulty) + sequenceDelay;
  }

  for (const entity of runtime.entities) {
    if (entity.type === "event" && entity.motion === "falling") {
      entity.y = Math.min(
        entity.targetY ?? GROUND_Y - entity.height,
        entity.y + (entity.velocityY ?? 180) * delta
      );
      if (entity.y >= (entity.targetY ?? GROUND_Y - entity.height)) {
        entity.motion = "ground";
      }
    } else {
      const motionPhase = runtime.elapsed * (entity.motionSpeed ?? 1.5) + (entity.phase ?? 0);
      const horizontalVariation = entity.motion === "sine"
        ? Math.sin(motionPhase) * (entity.amplitude ?? 18) * 1.35
        : 0;
      entity.x -= (speed + horizontalVariation) * delta;

      if (entity.type === "event" && entity.motion === "floating") {
        const originY = entity.originY ?? entity.y;
        entity.y = Math.min(
          GROUND_Y - entity.height,
          Math.max(
            GROUND_Y - entity.height - 128,
            originY + Math.sin(motionPhase) * (entity.amplitude ?? 16)
          )
        );
      } else if (entity.type === "event" && entity.motion === "sine") {
        const originY = entity.originY ?? entity.y;
        entity.y = Math.min(
          GROUND_Y - entity.height,
          Math.max(
            GROUND_Y - entity.height - 128,
            originY + Math.sin(motionPhase * 0.72) * (entity.amplitude ?? 18) * 0.55
          )
        );
      } else if (entity.type === "event" && entity.motion === "diagonal") {
        const originY = entity.originY ?? entity.y;
        const amplitude = entity.amplitude ?? 24;
        const lowerBound = Math.max(GROUND_Y - entity.height - 128, originY - amplitude);
        const upperBound = Math.min(GROUND_Y - entity.height, originY + amplitude);
        entity.y += (entity.velocityY ?? 54) * delta;
        if (entity.y > upperBound) {
          entity.y = upperBound;
          entity.velocityY = -Math.abs(entity.velocityY ?? 54);
        } else if (entity.y < lowerBound) {
          entity.y = lowerBound;
          entity.velocityY = Math.abs(entity.velocityY ?? 54);
        }
      }
    }
  }

  if (runtime.velocityY >= 0) {
    const previousBottom = previousPlayerY + PLAYER_SIZE;
    const proposedBottom = runtime.playerY + PLAYER_SIZE;
    let landingTop: number | null = null;

    for (const entity of runtime.entities) {
      if (entity.type !== "physical") continue;
      const profile = getObstacleProfile(entity.kind as PhysicalObstacleKind);
      if (!profile.walkable) continue;
      const obstacleRect = getObstacleHitbox(entity);
      const horizontalOverlap =
        runtime.playerX + PLAYER_SIZE - 9 > obstacleRect.x &&
        runtime.playerX + 9 < obstacleRect.x + obstacleRect.width;
      const crossedTop =
        previousBottom <= obstacleRect.y + 9 && proposedBottom >= obstacleRect.y;

      if (horizontalOverlap && crossedTop) {
        landingTop = landingTop === null
          ? obstacleRect.y
          : Math.min(landingTop, obstacleRect.y);
      }
    }

    if (landingTop !== null) {
      runtime.playerY = landingTop - PLAYER_SIZE;
      runtime.velocityY = 0;
      runtime.grounded = true;
    }
  }

  let playerRect = getPlayerHitbox(runtime, time);

  const remainingEntities: RunnerEntity[] = [];
  for (const entity of runtime.entities) {
    const entityRect = entity.type === "physical"
      ? getObstacleHitbox(entity)
      : {
          x: entity.x + 5,
          y: entity.y + 5,
          width: entity.width - 10,
          height: entity.height - 10,
        };
    const hit = intersects(playerRect, entityRect);

    if (hit) {
      if (entity.type === "event") {
        applyEvent(runtime, entity.kind as EventKind, time);
        continue;
      } else {
        const profile = getObstacleProfile(entity.kind as PhysicalObstacleKind);
        const playerHitboxOffset = playerRect.x - runtime.playerX;
        runtime.playerX = Math.min(
          runtime.playerX,
          entityRect.x - playerHitboxOffset - playerRect.width
        );
        runtime.blockedObstacleId = entity.id;

        if (!entity.alreadyHit) {
          applyPhysicalHit(runtime, time, profile.height === "high");
          entity.alreadyHit = true;
        }
        playerRect = getPlayerHitbox(runtime, time);
      }
    }

    if (
      entity.type === "physical" &&
      !entity.alreadyHit &&
      !entity.rewarded &&
      entity.x + entity.width < runtime.playerX
    ) {
      entity.rewarded = true;
      awardPerfectPass(runtime);
    }

    if (entity.x + entity.width > -40) remainingEntities.push(entity);
  }
  runtime.entities = remainingEntities;

  if (runtime.playerX + PLAYER_SIZE < 0 && !runtime.finished) {
    runtime.gameOverReason = "Sei rimasto indietro";
    runtime.effect = "hit";
    runtime.finished = true;
  }

  const remainingPits: GroundPit[] = [];
  const playerCenter = runtime.playerX + PLAYER_SIZE / 2;
  const nearGround = runtime.grounded && runtime.playerY > PLAYER_GROUND_Y - 3;

  for (const pit of runtime.pits) {
    pit.x -= speed * delta;
    if (
      nearGround &&
      playerCenter > pit.x + 10 &&
      playerCenter < pit.x + pit.width - 10
    ) {
      runtime.teamRating = TEAM_RATING_THRESHOLD - 1;
      runtime.gameOverReason = "Caduta in una buca";
      runtime.effect = "hit";
      runtime.finished = true;
    }

    if (
      !pit.rewarded &&
      pit.x + pit.width < runtime.playerX &&
      !runtime.finished
    ) {
      pit.rewarded = true;
      awardPerfectPass(runtime);
    }
    if (pit.x + pit.width > -40) remainingPits.push(pit);
  }
  runtime.pits = remainingPits;

  if (runtime.teamRating < TEAM_RATING_THRESHOLD && !runtime.finished) {
    runtime.gameOverReason = `Voto squadra sotto ${TEAM_RATING_THRESHOLD}`;
    runtime.finished = true;
  }
}

function spawnNext(runtime: Runtime, speed: number, difficulty: number) {
  const decision = createSpawnDecision({
    elapsed: runtime.elapsed,
    difficulty,
  });
  const startX = GAME_WIDTH + Math.max(40, speed * 0.08);

  if (decision.type === "pit") {
    runtime.pits.push({
      id: runtime.nextEntityId++,
      x: startX,
      width: decision.width,
    });
    if (decision.bonus) {
      pushEvent(runtime, decision.bonus.kind, startX + decision.width / 2 - 26, 1, {
        motion: "floating",
        amplitude: 12,
        motionSpeed: 1.35,
      });
    }
    return 0;
  }

  if (decision.type === "sequence") {
    const actionWindow = 0.98 - difficulty * 0.24;
    const gap = speed * actionWindow + 135;
    decision.kinds.forEach((kind, index) => {
      pushPhysicalObstacle(runtime, kind, startX + gap * index);
    });
    return (gap * (decision.kinds.length - 1)) / speed;
  }

  if (decision.type === "physical") {
    pushPhysicalObstacle(runtime, decision.kind, startX);
    if (decision.bonus) {
      const dimensions = getPhysicalDimensions(decision.kind);
      const isOverhead = decision.kind === "overhead" || decision.kind === "sign";
      pushEvent(
        runtime,
        decision.bonus.kind,
        isOverhead ? startX + dimensions.width + 72 : startX + dimensions.width / 2 - 26,
        isOverhead ? 0 : 1,
        { motion: "floating", amplitude: 10, motionSpeed: 1.2 }
      );
    }
    return 0;
  }

  const trail = Math.max(1, decision.trail ?? 1);
  for (let index = 0; index < trail; index += 1) {
    const heightOffset = (decision.trailRise ?? 0) * index;
    pushEvent(
      runtime,
      decision.event.kind,
      startX + (decision.xOffset ?? 0) + index * 78,
      decision.heightLevel,
      {
        falling: decision.falling && index === 0,
        fallSpeed: decision.fallSpeed,
        motion: decision.motion,
        amplitude: decision.amplitude,
        motionSpeed: decision.motionSpeed,
        heightOffset,
      }
    );
  }
  return 0;
}

function pushEvent(
  runtime: Runtime,
  kind: EventKind,
  x: number,
  heightLevel: 0 | 1 | 2,
  options: {
    falling?: boolean;
    fallSpeed?: number;
    motion?: RunnerEntity["motion"];
    amplitude?: number;
    motionSpeed?: number;
    heightOffset?: number;
  } = {}
) {
  const size = kind === "hatTrick" ? 60 : 52;
  const levelOffset = heightLevel === 2 ? 106 : heightLevel === 1 ? 58 : 0;
  const targetY = Math.max(
    GROUND_Y - size - 128,
    Math.min(GROUND_Y - size, GROUND_Y - size - levelOffset - (options.heightOffset ?? 0))
  );
  const falling = Boolean(options.falling);
  const motion = falling ? "falling" : options.motion ?? "ground";
  runtime.entities.push({
    id: runtime.nextEntityId++,
    type: "event",
    kind,
    x,
    y: falling ? -size - 24 : targetY,
    width: size,
    height: size,
    motion,
    velocityY: falling
      ? options.fallSpeed
      : motion === "diagonal"
        ? 48 + (options.motionSpeed ?? 1) * 12
        : undefined,
    targetY: falling ? GROUND_Y - size : targetY,
    originY: targetY,
    amplitude: options.amplitude,
    phase: runtime.nextEntityId * 0.71,
    motionSpeed: options.motionSpeed,
  });
}

function pushPhysicalObstacle(
  runtime: Runtime,
  kind: PhysicalObstacleKind,
  x: number
) {
  const dimensions = getPhysicalDimensions(kind);
  runtime.entities.push({
    id: runtime.nextEntityId++,
    type: "physical",
    kind,
    x,
    y:
      kind === "overhead"
        ? GROUND_Y - 93
        : GROUND_Y - dimensions.height,
    width: dimensions.width,
    height: dimensions.height,
    alreadyHit: false,
    rewarded: false,
  });
}

function applyEvent(runtime: Runtime, kind: EventKind, time: number) {
  const definition = EVENT_DEFINITIONS[kind];

  if (
    definition.category === "malus" &&
    runtime.protectionAvailable &&
    runtime.elapsed < INITIAL_PROTECTION_SECONDS
  ) {
    runtime.protectionAvailable = false;
    runtime.effect = "bonus";
    runtime.effectUntil = time + 430;
    return;
  }

  const goalTriggered = addTeamRating(runtime, definition.ratingDelta, time);
  runtime.score = Math.max(
    0,
    runtime.score + definition.arcadePoints * Math.max(1, runtime.multiplier)
  );

  if (definition.category === "bonus") {
    runtime.bonusesCollected += 1;
    runtime.multiplier = Math.min(5, runtime.multiplier + 0.25);
    if (!goalTriggered) runtime.effect = "bonus";
  } else {
    runtime.malusesCollected += 1;
    runtime.multiplier = 1;
    if (!goalTriggered) runtime.effect = "malus";
  }

  const signedValue = definition.ratingDelta > 0
    ? `+${formatRating(definition.ratingDelta)}`
    : formatRating(definition.ratingDelta);
  runtime.message = `${definition.label.toUpperCase()}  ${signedValue}`;
  runtime.messageTone = definition.category;
  runtime.messageUntil = time + 920;
  if (!goalTriggered) runtime.effectUntil = time + 460;
}

function addTeamRating(runtime: Runtime, delta: number, time: number) {
  runtime.teamRating = roundRating(runtime.teamRating + delta);
  const goals = calculateGoals(runtime.teamRating);

  if (goals > runtime.maxGoalsReached) {
    const newGoals = goals - runtime.maxGoalsReached;
    runtime.maxGoalsReached = goals;
    runtime.goalCelebrationGoals = goals;
    runtime.goalCelebrationUntil = time + 1050;
    runtime.score += GOAL_THRESHOLD_SCORE_BONUS * newGoals;
    runtime.multiplier = Math.min(
      5,
      runtime.multiplier + GOAL_THRESHOLD_COMBO_BONUS * newGoals
    );
    runtime.effect = "goal";
    runtime.effectUntil = time + 1050;
    return true;
  }
  return false;
}

function awardPerfectPass(runtime: Runtime) {
  runtime.flowProgress = Math.min(
    100,
    runtime.flowProgress + FLOW_PERFECT_OBSTACLE
  );
  runtime.score += 90 * Math.max(1, runtime.multiplier);
}

function applyPhysicalHit(runtime: Runtime, time: number, repel: boolean) {
  runtime.score = Math.max(0, runtime.score - 120);
  runtime.multiplier = 1;
  if (repel) runtime.horizontalVelocity = Math.min(runtime.horizontalVelocity, -185);
  runtime.effect = "hit";
  runtime.effectUntil = time + 420;
}

function toSnapshot(runtime: Runtime, best: number, time: number): GameSnapshot {
  const score = Math.max(0, Math.round(runtime.score));
  const scenario = getScenarioState(runtime.elapsed).current;
  return {
    score,
    best: Math.max(best, score),
    multiplier: runtime.multiplier,
    teamRating: runtime.teamRating,
    threshold: TEAM_RATING_THRESHOLD,
    goals: calculateGoals(runtime.teamRating),
    nextGoalThreshold: getGoalThreshold(calculateGoals(runtime.teamRating) + 1),
    protectionActive:
      runtime.protectionAvailable && runtime.elapsed < INITIAL_PROTECTION_SECONDS,
    protectionRemaining:
      runtime.protectionAvailable && runtime.elapsed < INITIAL_PROTECTION_SECONDS
        ? Math.max(0, INITIAL_PROTECTION_SECONDS - runtime.elapsed)
        : 0,
    flowProgress: Math.round(runtime.flowProgress),
    speedLevel: getSpeedLevel(getDifficultyProgress(runtime)),
    distance: Math.round(runtime.distance),
    scenarioName: scenario.name,
    bonusesCollected: runtime.bonusesCollected,
    malusesCollected: runtime.malusesCollected,
    message: time < runtime.messageUntil ? runtime.message : "",
    gameOverReason: runtime.gameOverReason,
  };
}

function getDifficultyProgress(runtime: Runtime) {
  const duration = clamp01(runtime.elapsed / DIFFICULTY_CONFIG.rampSeconds);
  const distance = clamp01(runtime.distance / DIFFICULTY_CONFIG.targetDistance);
  const score = clamp01(runtime.score / DIFFICULTY_CONFIG.targetScore);
  const scenarioStep = Math.floor(runtime.elapsed / SCENARIO_DURATION_SECONDS);
  const competition = clamp01(
    scenarioStep / DIFFICULTY_CONFIG.scenarioStepsToMaximum
  );
  const weighted =
    duration * DIFFICULTY_CONFIG.weights.duration +
    distance * DIFFICULTY_CONFIG.weights.distance +
    score * DIFFICULTY_CONFIG.weights.score +
    competition * DIFFICULTY_CONFIG.weights.competition;
  return weighted * weighted * (3 - 2 * weighted);
}

function getRunSpeed(difficulty: number) {
  const curved = Math.pow(clamp01(difficulty), DIFFICULTY_CONFIG.speedCurvePower);
  return SPEED_CONFIG.initial + (SPEED_CONFIG.maximum - SPEED_CONFIG.initial) * curved;
}

function getSpeedLevel(difficulty: number) {
  return Math.min(12, 1 + Math.floor(clamp01(difficulty) * 11));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getPhysicalDimensions(kind: PhysicalObstacleKind) {
  if (kind === "barrier") return { width: 58, height: 42 };
  if (kind === "sign") return { width: 42, height: 72 };
  if (kind === "overhead") return { width: 88, height: 36 };
  if (kind === "platform") return { width: 94, height: 28 };
  return { width: 62, height: 54 };
}

function getObstacleProfile(kind: PhysicalObstacleKind) {
  if (kind === "barrier" || kind === "block" || kind === "platform") {
    return { height: "low" as const, walkable: true };
  }
  return { height: "high" as const, walkable: false };
}

function getObstacleHitbox(entity: RunnerEntity) {
  const kind = entity.kind as PhysicalObstacleKind;
  if (kind === "barrier") {
    return { x: entity.x + 3, y: entity.y + 7, width: entity.width - 6, height: entity.height - 7 };
  }
  if (kind === "platform") {
    return { x: entity.x + 2, y: entity.y + 2, width: entity.width - 4, height: entity.height - 2 };
  }
  if (kind === "sign") {
    return { x: entity.x + 6, y: entity.y + 1, width: entity.width - 12, height: entity.height - 1 };
  }
  if (kind === "overhead") {
    return { x: entity.x + 6, y: entity.y + 3, width: entity.width - 12, height: entity.height - 6 };
  }
  return { x: entity.x + 4, y: entity.y + 4, width: entity.width - 8, height: entity.height - 4 };
}

function getPlayerHitbox(runtime: Runtime, time: number) {
  if (isCrouching(runtime, time)) {
    return {
      x: runtime.playerX + 3,
      y: runtime.playerY + 14,
      width: PLAYER_SIZE - 6,
      height: PLAYER_SIZE - 14,
    };
  }
  if (!runtime.grounded) {
    return {
      x: runtime.playerX + 10,
      y: runtime.playerY + 7,
      width: PLAYER_SIZE - 20,
      height: PLAYER_SIZE - 12,
    };
  }
  return {
    x: runtime.playerX + 8,
    y: runtime.playerY + 5,
    width: PLAYER_SIZE - 16,
    height: PLAYER_SIZE - 7,
  };
}

function isCrouching(runtime: Runtime, time: number) {
  return runtime.grounded && time < runtime.crouchUntil;
}

function calculateGoals(teamRating: number) {
  return Math.max(
    0,
    Math.floor((teamRating - TEAM_RATING_THRESHOLD) / GOAL_RATING_STEP)
  );
}

function getGoalThreshold(goalNumber: number) {
  return TEAM_RATING_THRESHOLD + goalNumber * GOAL_RATING_STEP;
}

function intersects(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

function formatRating(value: number) {
  return value.toLocaleString("it-IT", { maximumFractionDigits: 1 });
}

function drawGame(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  logo: HTMLImageElement | null,
  time: number,
  reducedMotion: boolean
) {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const scenarioState = getScenarioState(runtime.elapsed);

  drawScenario(context, scenarioState.current, runtime, 1, reducedMotion);
  if (scenarioState.transition < 1) {
    drawScenario(
      context,
      scenarioState.previous,
      runtime,
      1 - scenarioState.transition,
      reducedMotion
    );
  }

  drawGround(context, scenarioState.current, runtime.pits, 1);
  if (scenarioState.transition < 1) {
    drawGround(
      context,
      scenarioState.previous,
      runtime.pits,
      1 - scenarioState.transition
    );
  }
  runtime.entities.forEach((entity) => drawEntity(context, entity));
  drawPlayer(context, runtime, logo, time, scenarioState.current, reducedMotion);
  drawGoalCelebration(context, runtime, time, scenarioState.current);
  drawEventFeedback(context, runtime, time);
}

function drawScenario(
  context: CanvasRenderingContext2D,
  scenario: GameScenario,
  runtime: Runtime,
  alpha: number,
  reducedMotion: boolean
) {
  context.save();
  context.globalAlpha = alpha;
  const sky = context.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, scenario.skyTop);
  sky.addColorStop(1, scenario.skyBottom);
  context.fillStyle = sky;
  context.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

  drawMinimalArena(context, scenario, runtime.elapsed, reducedMotion);
  context.restore();
}

function drawGround(
  context: CanvasRenderingContext2D,
  scenario: GameScenario,
  pits: GroundPit[],
  alpha: number
) {
  context.save();
  context.globalAlpha = alpha;
  const ground = context.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
  ground.addColorStop(0, scenario.grassLight);
  ground.addColorStop(0.22, scenario.grassDark);
  ground.addColorStop(1, scenario.ground);
  context.fillStyle = ground;
  context.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  context.globalAlpha = alpha * 0.13;
  const stripeWidth = 112;
  for (let x = 0; x < GAME_WIDTH + stripeWidth; x += stripeWidth * 2) {
    context.fillStyle = "#d9f99d";
    context.fillRect(x, GROUND_Y, stripeWidth, GAME_HEIGHT - GROUND_Y);
  }

  context.globalAlpha = alpha * 0.7;
  context.strokeStyle = "rgba(255,255,255,0.78)";
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(0, GROUND_Y + 5);
  context.lineTo(GAME_WIDTH, GROUND_Y + 5);
  context.stroke();
  context.globalAlpha = alpha;

  for (const pit of pits) {
    const rim = context.createLinearGradient(pit.x, 0, pit.x + pit.width, 0);
    rim.addColorStop(0, "#65442d");
    rim.addColorStop(0.48, "#1c130e");
    rim.addColorStop(1, "#6f4a2f");
    context.fillStyle = rim;
    context.beginPath();
    context.moveTo(pit.x - 7, GROUND_Y - 3);
    context.lineTo(pit.x + pit.width + 7, GROUND_Y - 3);
    context.lineTo(pit.x + pit.width - 5, GAME_HEIGHT);
    context.lineTo(pit.x + 5, GAME_HEIGHT);
    context.closePath();
    context.fill();

    const depth = context.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
    depth.addColorStop(0, "#120c08");
    depth.addColorStop(0.55, "#080503");
    depth.addColorStop(1, "#24150d");
    context.fillStyle = depth;
    context.beginPath();
    context.moveTo(pit.x + 3, GROUND_Y + 2);
    context.lineTo(pit.x + pit.width - 3, GROUND_Y + 2);
    context.lineTo(pit.x + pit.width - 12, GAME_HEIGHT);
    context.lineTo(pit.x + 12, GAME_HEIGHT);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(214,178,122,0.78)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(pit.x - 5, GROUND_Y - 2);
    context.quadraticCurveTo(pit.x + pit.width / 2, GROUND_Y + 10, pit.x + pit.width + 5, GROUND_Y - 2);
    context.stroke();
  }
  context.restore();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  logo: HTMLImageElement | null,
  time: number,
  scenario: GameScenario,
  reducedMotion: boolean
) {
  const airborne = runtime.playerY < PLAYER_GROUND_Y - 3;
  const crouching = isCrouching(runtime, time);
  const hitReaction = runtime.effect === "hit" || runtime.effect === "malus";
  const jitter = hitReaction && !reducedMotion ? Math.sin(time / 28) * 4 : 0;

  context.save();
  context.globalAlpha = airborne ? 0.16 : 0.3;
  context.fillStyle = "#020617";
  context.beginPath();
  context.ellipse(
    runtime.playerX + PLAYER_SIZE / 2,
    runtime.playerY + PLAYER_SIZE + (airborne ? Math.min(38, (PLAYER_GROUND_Y - runtime.playerY) * 0.28) : 2),
    airborne ? 17 : crouching ? 31 : 25,
    airborne ? 4 : 6,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();

  context.save();
  const runCycle = reducedMotion ? 0 : Math.sin(runtime.elapsed * 10.5);
  const rising = runtime.velocityY < -30;
  const falling = runtime.velocityY > 80;
  const centerX = runtime.playerX + PLAYER_SIZE / 2 + jitter;
  const groundedBottom = runtime.playerY + PLAYER_SIZE;
  const centerY = crouching
    ? groundedBottom - PLAYER_SIZE * 0.41
    : runtime.playerY + PLAYER_SIZE / 2 + (airborne ? 0 : runCycle * 1.4);
  const playerScale = hitReaction
      ? 0.92
      : airborne
        ? rising ? 0.98 : 1.02
        : 1 + Math.abs(runCycle) * 0.008;
  const scaleX = crouching ? 1.08 : playerScale;
  const scaleY = crouching ? 0.82 : playerScale;
  const rotation = crouching
    ? -0.035
    : airborne
      ? rising ? -0.075 : falling ? 0.055 : 0
      : runCycle * 0.018;

  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.scale(scaleX, scaleY);

  if (runtime.effect && time < runtime.effectUntil) {
    context.shadowColor =
      runtime.effect === "bonus"
        ? "rgba(74,222,128,0.8)"
        : runtime.effect === "goal"
          ? "rgba(251,191,36,0.85)"
        : runtime.effect === "jump"
          ? `${scenario.accent}aa`
          : "rgba(248,113,113,0.8)";
    context.shadowBlur = runtime.effect === "jump" ? 9 : 16;
  } else if (airborne) {
    context.shadowColor = `${scenario.accent}66`;
    context.shadowBlur = 7;
  }

  if (logo?.complete && logo.naturalWidth > 0) {
    const scale = Math.min(
      PLAYER_SIZE / logo.naturalWidth,
      PLAYER_SIZE / logo.naturalHeight
    );
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    context.drawImage(
      logo,
      -width / 2,
      -height / 2,
      width,
      height
    );
  } else {
    context.fillStyle = scenario.accent;
    context.font = "900 21px sans-serif";
    context.textAlign = "center";
    context.fillText(
      "FA20",
      0,
      8
    );
  }
  context.restore();
}

function drawEntity(context: CanvasRenderingContext2D, entity: RunnerEntity) {
  if (entity.type === "physical") {
    drawPhysicalObstacle(context, entity);
    return;
  }

  const definition = EVENT_DEFINITIONS[entity.kind as EventKind];
  const isBonus = definition.category === "bonus";
  if (entity.motion === "falling") {
    const targetY = entity.targetY ?? GROUND_Y - entity.height;
    const progress = Math.max(
      0,
      Math.min(1, (entity.y + entity.height + 24) / (targetY + entity.height + 24))
    );
    context.save();
    context.globalAlpha = 0.2 + progress * 0.42;
    context.fillStyle = definition.color;
    context.beginPath();
    context.ellipse(
      entity.x + entity.width / 2,
      GROUND_Y + 3,
      13 + progress * 12,
      4 + progress * 2,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
    context.strokeStyle = `${definition.border}bb`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(
      entity.x + entity.width / 2,
      GROUND_Y + 2,
      19 + Math.sin(progress * Math.PI) * 7,
      0,
      Math.PI * 2
    );
    context.stroke();
    context.restore();
  }
  if (!isBonus && entity.motion && entity.motion !== "ground" && entity.motion !== "falling") {
    context.save();
    context.globalAlpha = 0.28;
    context.strokeStyle = definition.border;
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.ellipse(
      entity.x + entity.width / 2,
      entity.y + entity.height / 2,
      entity.width / 2 + 7,
      entity.height / 2 + 7,
      0,
      0,
      Math.PI * 2
    );
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }
  context.save();
  context.shadowColor = isBonus ? `${definition.color}88` : "rgba(0,0,0,0.35)";
  context.shadowBlur = isBonus ? 15 : 7;
  context.fillStyle = definition.color;
  context.strokeStyle = definition.border;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(
    entity.x + entity.width / 2,
    entity.y + entity.height / 2,
    entity.width / 2 - 2,
    0,
    Math.PI * 2
  );
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = isBonus ? "#ffffff" : "#071f45";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 17px sans-serif";
  context.fillText(
    definition.symbol,
    entity.x + entity.width / 2,
    entity.y + entity.height / 2 - 5
  );
  context.font = "900 7px sans-serif";
  context.fillText(
    definition.shortLabel,
    entity.x + entity.width / 2,
    entity.y + entity.height - 10
  );
  context.restore();
}

function drawPhysicalObstacle(context: CanvasRenderingContext2D, entity: RunnerEntity) {
  context.save();
  context.shadowColor = "rgba(2,6,23,0.55)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 7;

  if (entity.kind === "barrier") {
    const coneGradient = context.createLinearGradient(0, entity.y, 0, entity.y + entity.height);
    coneGradient.addColorStop(0, "#fdba74");
    coneGradient.addColorStop(1, "#ea580c");
    for (let index = 0; index < 3; index += 1) {
      const coneX = entity.x + 3 + index * 19;
      context.fillStyle = coneGradient;
      context.beginPath();
      context.moveTo(coneX + 8, entity.y + 4);
      context.lineTo(coneX + 16, entity.y + entity.height - 5);
      context.lineTo(coneX, entity.y + entity.height - 5);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = "rgba(255,255,255,0.88)";
      context.fillRect(coneX + 3, entity.y + 23, 10, 4);
      context.fillStyle = "#9a3412";
      roundedRect(context, coneX - 2, entity.y + entity.height - 7, 20, 7, 2);
      context.fill();
    }
  } else if (entity.kind === "sign") {
    const mannequin = context.createLinearGradient(entity.x, entity.y, entity.x + entity.width, entity.y + entity.height);
    mannequin.addColorStop(0, "#facc15");
    mannequin.addColorStop(0.55, "#eab308");
    mannequin.addColorStop(1, "#a16207");
    context.fillStyle = mannequin;
    context.beginPath();
    context.arc(entity.x + entity.width / 2, entity.y + 11, 9, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(entity.x + 9, entity.y + 24);
    context.quadraticCurveTo(entity.x + entity.width / 2, entity.y + 18, entity.x + entity.width - 9, entity.y + 24);
    context.lineTo(entity.x + entity.width - 13, entity.y + 54);
    context.lineTo(entity.x + 26, entity.y + 54);
    context.lineTo(entity.x + 30, entity.y + entity.height - 7);
    context.lineTo(entity.x + 22, entity.y + entity.height - 7);
    context.lineTo(entity.x + 20, entity.y + 55);
    context.lineTo(entity.x + 12, entity.y + entity.height - 7);
    context.lineTo(entity.x + 4, entity.y + entity.height - 7);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(113,63,18,0.65)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#334155";
    roundedRect(context, entity.x, entity.y + entity.height - 8, entity.width, 8, 3);
    context.fill();
  } else if (entity.kind === "overhead") {
    const banner = context.createLinearGradient(entity.x, entity.y, entity.x + entity.width, entity.y);
    banner.addColorStop(0, "#1d4ed8");
    banner.addColorStop(0.5, entity.alreadyHit ? "#64748b" : "#0ea5e9");
    banner.addColorStop(1, "#1e3a8a");
    context.fillStyle = banner;
    roundedRect(context, entity.x, entity.y, entity.width, entity.height, 4);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(219,234,254,0.9)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "900 6px sans-serif";
    context.textAlign = "center";
    context.fillText("IL FANTA A 20", entity.x + entity.width / 2, entity.y + 21);
    context.strokeStyle = "rgba(226,232,240,0.72)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(entity.x + 8, entity.y);
    context.lineTo(entity.x + 13, entity.y - 42);
    context.moveTo(entity.x + entity.width - 8, entity.y);
    context.lineTo(entity.x + entity.width - 13, entity.y - 42);
    context.stroke();
  } else if (entity.kind === "platform") {
    const net = context.createLinearGradient(0, entity.y, 0, entity.y + entity.height);
    net.addColorStop(0, "#f8fafc");
    net.addColorStop(0.4, "#94a3b8");
    net.addColorStop(1, "#334155");
    context.fillStyle = net;
    roundedRect(context, entity.x + 4, entity.y + 4, entity.width - 8, entity.height - 4, 12);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(30,41,59,0.38)";
    context.lineWidth = 1;
    for (let x = entity.x + 10; x < entity.x + entity.width - 8; x += 9) {
      context.beginPath();
      context.moveTo(x, entity.y + 5);
      context.lineTo(x + 8, entity.y + entity.height - 2);
      context.stroke();
    }
    context.fillStyle = "#1e293b";
    roundedRect(context, entity.x, entity.y + entity.height - 5, entity.width, 5, 2);
    context.fill();
  } else {
    const bag = context.createLinearGradient(entity.x, entity.y, entity.x, entity.y + entity.height);
    bag.addColorStop(0, "#475569");
    bag.addColorStop(1, "#0f172a");
    context.fillStyle = bag;
    roundedRect(context, entity.x + 2, entity.y + 12, entity.width - 4, entity.height - 12, 10);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(entity.x + entity.width / 2, entity.y + 15, 14, Math.PI, 0);
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.arc(entity.x + entity.width - 10, entity.y + entity.height - 9, 11, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#1e293b";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#1e293b";
    context.beginPath();
    context.moveTo(entity.x + entity.width - 10, entity.y + entity.height - 16);
    context.lineTo(entity.x + entity.width - 4, entity.y + entity.height - 7);
    context.lineTo(entity.x + entity.width - 15, entity.y + entity.height - 8);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawGoalCelebration(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  time: number,
  scenario: GameScenario
) {
  if (time >= runtime.goalCelebrationUntil) return;
  const progress = 1 - (runtime.goalCelebrationUntil - time) / 1050;
  const opacity = Math.max(0, 1 - progress);
  const radius = 55 + progress * 125;

  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = scenario.accent;
  context.lineWidth = 7 - progress * 5;
  context.beginPath();
  context.arc(
    runtime.playerX + PLAYER_SIZE / 2,
    runtime.playerY + PLAYER_SIZE / 2,
    radius,
    0,
    Math.PI * 2
  );
  context.stroke();
  context.fillStyle = "rgba(2,8,23,0.78)";
  roundedRect(context, GAME_WIDTH / 2 - 105, 88, 210, 76, 15);
  context.fill();
  context.textAlign = "center";
  context.fillStyle = "#fde68a";
  context.font = "900 30px sans-serif";
  context.fillText("GOL!", GAME_WIDTH / 2, 120);
  context.fillStyle = "#ffffff";
  context.font = "900 17px sans-serif";
  context.fillText(
    `${runtime.goalCelebrationGoals}–0`,
    GAME_WIDTH / 2,
    147
  );
  context.restore();
}

function drawEventFeedback(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  time: number
) {
  if (!runtime.message || !runtime.messageTone || time >= runtime.messageUntil) return;
  const positive = runtime.messageTone === "bonus";
  const negative = runtime.messageTone === "malus";

  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = "rgba(2,8,23,0.72)";
  roundedRect(context, GAME_WIDTH / 2 - 128, 24, 256, 34, 17);
  context.fill();
  context.strokeStyle = positive
    ? "rgba(110,231,183,0.55)"
    : negative
      ? "rgba(253,164,175,0.55)"
      : "rgba(255,255,255,0.18)";
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = positive ? "#a7f3d0" : negative ? "#fecdd3" : "#e2e8f0";
  context.font = "900 9px sans-serif";
  context.textAlign = "center";
  context.fillText(runtime.message, GAME_WIDTH / 2, 45);
  context.restore();
}

function drawMinimalArena(
  context: CanvasRenderingContext2D,
  scenario: GameScenario,
  elapsed: number,
  reducedMotion: boolean
) {
  const movement = reducedMotion ? 0 : (elapsed * 24) % 112;
  const parallax = reducedMotion ? 0 : (elapsed * 4) % 18;
  context.save();

  const standTop = scenario.decor === "terraces" ? 148 : scenario.decor === "towers" ? 126 : 92;
  const standBottom = 286;

  const roof = context.createLinearGradient(0, standTop - 24, 0, standTop + 34);
  roof.addColorStop(0, "rgba(2,6,23,0.95)");
  roof.addColorStop(1, scenario.stand);
  context.fillStyle = roof;
  context.beginPath();
  context.moveTo(0, standTop + 18);
  context.lineTo(70, standTop - 18);
  context.lineTo(GAME_WIDTH - 70, standTop - 18);
  context.lineTo(GAME_WIDTH, standTop + 18);
  context.lineTo(GAME_WIDTH, standBottom);
  context.lineTo(0, standBottom);
  context.closePath();
  context.fill();

  const tier = context.createLinearGradient(0, standTop, 0, standBottom);
  tier.addColorStop(0, "rgba(255,255,255,0.12)");
  tier.addColorStop(0.22, scenario.stand);
  tier.addColorStop(1, "rgba(2,6,23,0.92)");
  context.fillStyle = tier;
  context.fillRect(0, standTop + 20, GAME_WIDTH, standBottom - standTop - 20);

  context.globalAlpha = 0.48;
  for (let y = standTop + 42; y < standBottom - 18; y += 16) {
    for (let x = -parallax + ((y / 16) % 2) * 7; x < GAME_WIDTH; x += 15) {
      const tone = (Math.floor(x / 15) + Math.floor(y / 16)) % 4;
      context.fillStyle = tone === 0 ? scenario.accent : tone === 1 ? scenario.crowd : "#e2e8f0";
      context.beginPath();
      context.arc(x, y, scenario.decor === "terraces" ? 1.4 : 1.8, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;

  const lightAlpha = 0.14 + scenario.lightIntensity * 0.22;
  for (const x of [92, GAME_WIDTH - 92]) {
    const glow = context.createRadialGradient(x, 58, 4, x, 90, 190);
    glow.addColorStop(0, `rgba(255,255,255,${lightAlpha + 0.26})`);
    glow.addColorStop(0.25, `rgba(191,219,254,${lightAlpha})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.fillRect(x - 210, 0, 420, 290);
    context.fillStyle = "rgba(241,245,249,0.9)";
    roundedRect(context, x - 30, 42, 60, 15, 3);
    context.fill();
    context.fillStyle = "rgba(15,23,42,0.7)";
    context.fillRect(x - 3, 57, 6, standTop - 57);
  }

  context.fillStyle = "rgba(2,8,23,0.92)";
  context.fillRect(0, standBottom - 18, GAME_WIDTH, 30);
  for (let x = -movement; x < GAME_WIDTH + 112; x += 112) {
    const board = context.createLinearGradient(x, 0, x + 98, 0);
    board.addColorStop(0, scenario.secondary);
    board.addColorStop(1, scenario.accent);
    context.fillStyle = board;
    roundedRect(context, x, standBottom - 13, 98, 20, 3);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.88)";
    context.font = "900 6px sans-serif";
    context.textAlign = "center";
    context.fillText("IL FANTA A 20", x + 49, standBottom);
  }

  const pitch = context.createLinearGradient(0, standBottom, 0, GROUND_Y);
  pitch.addColorStop(0, scenario.grassDark);
  pitch.addColorStop(1, scenario.grassLight);
  context.fillStyle = pitch;
  context.fillRect(0, standBottom + 7, GAME_WIDTH, GROUND_Y - standBottom - 7);

  context.globalAlpha = 0.12;
  for (let x = -movement; x < GAME_WIDTH + 112; x += 224) {
    context.fillStyle = "#d9f99d";
    context.beginPath();
    context.moveTo(x, standBottom + 7);
    context.lineTo(x + 112, standBottom + 7);
    context.lineTo(x + 160, GROUND_Y);
    context.lineTo(x - 48, GROUND_Y);
    context.closePath();
    context.fill();
  }

  context.globalAlpha = 0.58;
  context.strokeStyle = "rgba(255,255,255,0.75)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, GROUND_Y);
  context.lineTo(270, standBottom + 8);
  context.moveTo(GAME_WIDTH - 72, GROUND_Y);
  context.lineTo(GAME_WIDTH - 270, standBottom + 8);
  context.stroke();
  context.beginPath();
  context.ellipse(GAME_WIDTH / 2, standBottom + 72, 76, 24, 0, 0, Math.PI * 2);
  context.stroke();

  if (scenario.wear > 0.1) {
    context.globalAlpha = scenario.wear * 0.22;
    context.fillStyle = "#a87945";
    for (let index = 0; index < 9; index += 1) {
      const x = (index * 137 + 43) % GAME_WIDTH;
      const y = standBottom + 28 + ((index * 31) % 92);
      context.beginPath();
      context.ellipse(x, y, 18 + (index % 3) * 7, 4 + (index % 2) * 3, -0.15, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (scenario.decor === "cup" || scenario.decor === "champions") {
    context.globalAlpha = 0.42;
    context.fillStyle = scenario.accent;
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 83 + 29) % GAME_WIDTH;
      const y = 55 + ((index * 47) % 180);
      context.beginPath();
      context.arc(x, y, 1.2 + (index % 3) * 0.45, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}
