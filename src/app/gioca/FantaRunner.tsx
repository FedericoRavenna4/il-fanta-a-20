"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import {
  BONUS_HEIGHT_OFFSETS,
  EVENT_DEFINITIONS,
  CROUCH_DURATION_MS,
  DIFFICULTY_BANDS,
  DIFFICULTY_CONFIG,
  ENTITY_DENSITY_CONFIG,
  FLOW_PERFECT_OBSTACLE,
  FLOW_PROGRESS_PER_SECOND,
  GAME_HEIGHT,
  GAME_SCENARIOS,
  GAME_WIDTH,
  GRAVITY,
  GROUND_Y,
  INITIAL_PROTECTION_SECONDS,
  JUMP_FORCE,
  JUMP_HOLD_ACCELERATION,
  JUMP_MAX_HOLD_SECONDS,
  JUMP_RELEASE_FACTOR,
  RAFFICA_CONFIG,
  SCENARIO_DISTANCE_METERS,
  GOAL_RATING_STEP,
  GOAL_THRESHOLD_COMBO_BONUS,
  GOAL_THRESHOLD_SCORE_BONUS,
  PLAYER_SIZE,
  PLAYER_X,
  SPEED_CONFIG,
  SPAWN_CONFIG,
  TEAM_RATING_INITIAL,
  TEAM_RATING_THRESHOLD,
} from "@/lib/game/config";
import { createSpawnDecision, getSafeSpawnInterval } from "@/lib/game/generator";
import {
  preloadGameAssets,
  preloadTeamLogo,
  type GameImageMap,
} from "@/lib/game/assetLoader";
import {
  BACKGROUND_STAGE_CONFIG,
  BACKGROUND_TRANSITION_CONFIG,
  EVENT_SPRITES,
  OBSTACLE_SPRITES,
  getBackgroundStageForDistance,
  type GameBackgroundStage,
} from "@/lib/game/assets";
import {
  POWER_UP_CONFIG,
  POWER_UP_SPAWN_CONFIG,
  pickPowerUp,
} from "@/lib/game/powerups";
import {
  BOSS_CONFIG,
  RAFFICA_PRESENTATION_ASSETS,
} from "@/lib/game/specialEvents";
import { logRatingChange, type RatingChangeReason } from "@/lib/game/rating";
import type {
  EventKind,
  GameScenario,
  GameSnapshot,
  GameStatus,
  GameTeam,
  GroundPit,
  PhysicalObstacleKind,
  PowerUpKind,
  RafficaType,
  RunnerEntity,
} from "@/lib/game/types";

type ActivePowerUp = { expiresAt: number; charges: number };
type PresentationState = {
  asset: string;
  title: string;
  subtitle: string;
  tone: "bonus" | "malus" | "neutral";
  until: number;
};
type BurstBeat = {
  category: "primary" | "counter" | "pause";
  count: number;
  gap?: number;
};

type Runtime = {
  playerX: number;
  playerVisible: boolean;
  playerY: number;
  velocityY: number;
  horizontalVelocity: number;
  grounded: boolean;
  jumpHeld: boolean;
  jumpHoldRemaining: number;
  blockedObstacleId: number | null;
  entities: RunnerEntity[];
  entityScratch: RunnerEntity[];
  entityPool: RunnerEntity[];
  pits: GroundPit[];
  pitScratch: GroundPit[];
  nextEntityId: number;
  spawnTimer: number;
  elapsed: number;
  score: number;
  peakScore: number;
  multiplier: number;
  teamRating: number;
  distance: number;
  bonusesCollected: number;
  malusesCollected: number;
  crouchUntil: number;
  protectionAvailable: boolean;
  protectionEndNotified: boolean;
  flowProgress: number;
  confirmedGoals: number;
  maxGoalsReached: number;
  hatTricksSpawned: number;
  goalCelebrationUntil: number;
  goalCelebrationGoals: number;
  message: string;
  messageTone: "bonus" | "malus" | null;
  messageStartedAt: number;
  messageUntil: number;
  effect: "bonus" | "malus" | "jump" | "hit" | "goal" | null;
  effectUntil: number;
  gameOverReason: string;
  lastFrame: number;
  lastHudUpdate: number;
  finished: boolean;
  backgroundStage: GameBackgroundStage;
  stadiumOffset: number;
  groundOffset: number;
  backgroundTransition: {
    from: GameBackgroundStage;
    to: GameBackgroundStage;
    progress: number;
    duration: number;
  } | null;
  burst: {
    type: RafficaType;
    phase: "warning" | "active";
    timer: number;
    durationRemaining: number;
    index: number;
    hatTrickSpawned: boolean;
    pattern: readonly BurstBeat[];
    beatIndex: number;
    beatItemIndex: number;
  } | null;
  malusBurstCooldown: number;
  bonusBurstCooldown: number;
  mutualBurstCooldown: number;
  burstOverlayType: RafficaType | null;
  burstOverlayIntensity: number;
  visualComfort: number;
  nextBurstEligibleAt: number;
  nextForcedBurstAt: number;
  lastSpawnCategory: "bonus" | "malus" | "physical" | "space" | null;
  repeatedSpawnCategory: number;
  activePowerUps: Partial<Record<PowerUpKind, ActivePowerUp>>;
  powerUpCollectionEffect: { kind: PowerUpKind; until: number } | null;
  powerUpCooldown: number;
  firstPowerUpSpawned: boolean;
  presentation: PresentationState | null;
  boss: {
    phase: "warning" | "active" | "exiting";
    timer: number;
    spawnTimer: number;
    lastShotAt: number;
  } | null;
  nextBossAt: number;
  reducedPerformance: boolean;
  mobileVisualScale: number;
  mobileLayout: boolean;
  worldWidth: number;
};

const PLAYER_GROUND_Y = GROUND_Y - PLAYER_SIZE;
const MALUS_RAFFICA_POOL: Array<{ kind: EventKind; weight: number }> = [
  { kind: "yellowCard", weight: 18 },
  { kind: "concededGoal", weight: 18 },
  { kind: "redCard", weight: 12 },
  { kind: "ownGoal", weight: 4 },
  { kind: "missedPenalty", weight: 3 },
];

const BONUS_RAFFICA_POOL: Array<{ kind: EventKind; weight: number }> = [
  { kind: "assist", weight: 18 },
  { kind: "cleanSheet", weight: 18 },
  { kind: "goal", weight: 4 },
];
const POWER_UP_KINDS: readonly PowerUpKind[] = [
  "luperto",
  "lukaku",
  "dybala",
  "nico-paz",
  "gimenez",
];
const RAFFICA_PATTERNS: Record<RafficaType, ReadonlyArray<readonly BurstBeat[]>> = {
  malus: [
    [
      { category: "primary", count: 3 }, { category: "pause", count: 0, gap: 0.95 },
      { category: "primary", count: 2 }, { category: "counter", count: 1 },
      { category: "primary", count: 4 }, { category: "pause", count: 0, gap: 1.15 },
      { category: "primary", count: 3 },
    ],
    [
      { category: "primary", count: 2 }, { category: "pause", count: 0, gap: 0.82 },
      { category: "primary", count: 4 }, { category: "counter", count: 1 },
      { category: "pause", count: 0, gap: 1.08 }, { category: "primary", count: 3 },
      { category: "primary", count: 2 },
    ],
  ],
  bonus: [
    [
      { category: "primary", count: 3 }, { category: "pause", count: 0, gap: 0.9 },
      { category: "primary", count: 2 }, { category: "counter", count: 1 },
      { category: "primary", count: 4 }, { category: "pause", count: 0, gap: 1.05 },
      { category: "primary", count: 3 },
    ],
    [
      { category: "primary", count: 2 }, { category: "primary", count: 3 },
      { category: "pause", count: 0, gap: 1.1 }, { category: "counter", count: 1 },
      { category: "primary", count: 4 }, { category: "pause", count: 0, gap: 0.88 },
      { category: "primary", count: 2 },
    ],
  ],
};
const RAFFICA_OVERLAY_CACHE = new Map<string, HTMLCanvasElement>();
const MOBILE_GAME_WIDTH = 540;
const MOBILE_GAME_HEIGHT = 820;
const MOBILE_WORLD_OFFSET_Y = 266;
const MOBILE_OBSTACLE_SCALE: Record<PhysicalObstacleKind, number> = {
  cornerFlag: 1.06,
  stretcher: 0.94,
  slidingTackle: 0.98,
  var: 1,
};
const MOBILE_EVENT_SCALE = 1.12;
const MOBILE_POWER_UP_SCALE = 1.08;
const MOBILE_PLAYER_SCALE = 1.24;

type CanvasRenderState = {
  context: CanvasRenderingContext2D | null;
  dirty: boolean;
  dprLimit: number;
  logicalWidth: number;
  logicalHeight: number;
};

type PerformanceMonitor = {
  windowStartedAt: number;
  frames: number;
  renderTime: number;
  slowWindows: number;
  lastLogAt: number;
  hudUpdates: number;
};

function createRuntime(): Runtime {
  return {
    playerX: PLAYER_X,
    playerVisible: true,
    playerY: PLAYER_GROUND_Y,
    velocityY: 0,
    horizontalVelocity: 0,
    grounded: true,
    jumpHeld: false,
    jumpHoldRemaining: 0,
    blockedObstacleId: null,
    entities: [],
    entityScratch: [],
    entityPool: createEntityPool(18),
    pits: [],
    pitScratch: [],
    nextEntityId: 1,
    spawnTimer: 1.05,
    elapsed: 0,
    score: 0,
    peakScore: 0,
    multiplier: 1,
    teamRating: TEAM_RATING_INITIAL,
    distance: 0,
    bonusesCollected: 0,
    malusesCollected: 0,
    crouchUntil: 0,
    protectionAvailable: true,
    protectionEndNotified: false,
    flowProgress: 0,
    confirmedGoals: 0,
    maxGoalsReached: 0,
    hatTricksSpawned: 0,
    goalCelebrationUntil: 0,
    goalCelebrationGoals: 0,
    message: "",
    messageTone: null,
    messageStartedAt: 0,
    messageUntil: 0,
    effect: null,
    effectUntil: 0,
    gameOverReason: "",
    lastFrame: 0,
    lastHudUpdate: 0,
    finished: false,
    backgroundStage: 1,
    stadiumOffset: 0,
    groundOffset: 0,
    backgroundTransition: null,
    burst: null,
    malusBurstCooldown: 0,
    bonusBurstCooldown: 0,
    mutualBurstCooldown: 0,
    burstOverlayType: null,
    burstOverlayIntensity: 0,
    visualComfort: 0,
    nextBurstEligibleAt: RAFFICA_CONFIG.initialQuietSeconds,
    nextForcedBurstAt: randomBetween(
      RAFFICA_CONFIG.firstForcedWindow.minimum,
      RAFFICA_CONFIG.firstForcedWindow.maximum
    ),
    lastSpawnCategory: null,
    repeatedSpawnCategory: 0,
    activePowerUps: {},
    powerUpCollectionEffect: null,
    powerUpCooldown: 0,
    firstPowerUpSpawned: false,
    presentation: null,
    boss: null,
    nextBossAt: randomBetween(
      BOSS_CONFIG.initialWindowSeconds.minimum,
      BOSS_CONFIG.initialWindowSeconds.maximum
    ),
    reducedPerformance: false,
    mobileVisualScale: 1,
    mobileLayout: false,
    worldWidth: GAME_WIDTH,
  };
}

function createEntityPool(size: number) {
  return Array.from({ length: size }, () => ({} as RunnerEntity));
}

function FantaRunner({
  team,
  status,
  runId,
  best,
  onSnapshot,
  onGameOver,
  onAssetsReady,
  onLoadProgress,
}: {
  team: GameTeam;
  status: GameStatus;
  runId: number;
  best: number;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onGameOver: (snapshot: GameSnapshot) => void;
  onAssetsReady: (ready: boolean) => void;
  onLoadProgress: (progress: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(createRuntime());
  const logoRef = useRef<HTMLImageElement | null>(null);
  const statusRef = useRef(status);
  const bestRef = useRef(best);
  const reducedMotionRef = useRef(false);
  const assetsRef = useRef<GameImageMap>(new Map());
  const renderStateRef = useRef<CanvasRenderState>({
    context: null,
    dirty: true,
    dprLimit: 1.5,
    logicalWidth: GAME_WIDTH,
    logicalHeight: GAME_HEIGHT,
  });
  const performanceRef = useRef<PerformanceMonitor>({
    windowStartedAt: 0,
    frames: 0,
    renderTime: 0,
    slowWindows: 0,
    lastLogAt: 0,
    hudUpdates: 0,
  });
  const touchGestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    triggered: false,
    jumping: false,
  });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  useEffect(() => {
    let cancelled = false;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    configureMobileRuntime(runtimeRef.current, renderStateRef.current, mobile);
    renderStateRef.current.dprLimit = mobile ? 1.6 : 1.5;
    renderStateRef.current.dirty = true;
    onAssetsReady(false);
    onLoadProgress(0);
    const logoPromise = preloadTeamLogo(team.logo).then((logo) => {
      if (!cancelled) onLoadProgress(0.14);
      return logo;
    });
    const assetPromise = preloadGameAssets((progress) => {
      if (!cancelled) onLoadProgress(0.14 + progress * 0.86);
    });

    Promise.all([logoPromise, assetPromise]).then(([logo, images]) => {
      if (cancelled) return;
      logoRef.current = logo;
      assetsRef.current = images;
      const canvas = canvasRef.current;
      if (!canvas) return;
      runtimeRef.current.playerVisible = true;
      const context = prepareCanvas(canvas, renderStateRef.current, true);
      drawGame(
        context,
        runtimeRef.current,
        logo,
        images,
        performance.now(),
        reducedMotionRef.current
      );
      onLoadProgress(1);
      requestAnimationFrame(() => {
        if (!cancelled) onAssetsReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onAssetsReady, onLoadProgress, team.logo]);

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
    const runtime = createRuntime();
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    configureMobileRuntime(runtime, renderStateRef.current, mobile);
    runtime.playerVisible = true;
    runtimeRef.current = runtime;
    performanceRef.current = {
      windowStartedAt: 0,
      frames: 0,
      renderTime: 0,
      slowWindows: 0,
      lastLogAt: 0,
      hudUpdates: 0,
    };
    renderStateRef.current.dirty = true;
    onSnapshot(toSnapshot(runtimeRef.current, bestRef.current, 0));
  }, [onSnapshot, runId]);

  const beginJump = useCallback(() => {
    if (statusRef.current !== "running") return;
    const runtime = runtimeRef.current;
    if (runtime.grounded) {
      runtime.crouchUntil = 0;
      runtime.grounded = false;
      runtime.blockedObstacleId = null;
      const lukakuStrength = getPowerUpStrength(runtime, "lukaku");
      const mobileJumpBoost = runtime.mobileLayout ? 1.2 : 1;
      runtime.velocityY = JUMP_FORCE * mobileJumpBoost * (1 + lukakuStrength * 0.26);
      runtime.jumpHeld = true;
      runtime.jumpHoldRemaining = JUMP_MAX_HOLD_SECONDS *
        (runtime.mobileLayout ? 1.18 : 1) *
        (1 + lukakuStrength * 0.22);
      runtime.effect = "jump";
      runtime.effectUntil = performance.now() + 360;
    }
  }, []);

  const releaseJump = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime.jumpHeld) return;
    runtime.jumpHeld = false;
    runtime.jumpHoldRemaining = 0;
    if (runtime.velocityY < 0) {
      runtime.velocityY *= JUMP_RELEASE_FACTOR;
    }
  }, []);

  const cancelJumpAndDuck = useCallback(() => {
    const runtime = runtimeRef.current;
    runtime.jumpHeld = false;
    runtime.jumpHoldRemaining = 0;
    if (!runtime.grounded && runtime.playerY > PLAYER_GROUND_Y - 18) {
      runtime.playerY = PLAYER_GROUND_Y;
      runtime.velocityY = 0;
      runtime.grounded = true;
    }
    if (runtime.grounded) {
      runtime.crouchUntil = performance.now() + CROUCH_DURATION_MS;
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
        if (!event.repeat) beginJump();
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        duck();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" || event.code === "ArrowUp") {
        releaseJump();
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [beginJump, duck, releaseJump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "running") return;

    let animationFrame = 0;
    const runtime = runtimeRef.current;
    runtime.lastFrame = 0;

    const frame = (time: number) => {
      if (statusRef.current !== "running") return;
      const frameStartedAt = performance.now();
      const context = prepareCanvas(canvas, renderStateRef.current);
      const delta = runtime.lastFrame
        ? Math.min((time - runtime.lastFrame) / 1000, 0.035)
        : 0;
      runtime.lastFrame = time;

      updateRuntime(runtime, delta, time);
      drawGame(
        context,
        runtime,
        logoRef.current,
        assetsRef.current,
        time,
        reducedMotionRef.current
      );

      if (!runtime.finished && time - runtime.lastHudUpdate >= 160) {
        runtime.lastHudUpdate = time;
        onSnapshot(toSnapshot(runtime, best, time));
        performanceRef.current.hudUpdates += 1;
      }

      updatePerformanceMonitor(
        performanceRef.current,
        runtime,
        renderStateRef.current,
        time,
        performance.now() - frameStartedAt
      );

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
    const context = prepareCanvas(canvas, renderStateRef.current);
    drawGame(
      context,
      runtimeRef.current,
      logoRef.current,
      assetsRef.current,
      performance.now(),
      reducedMotionRef.current
    );
  }, [status, team.logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      renderStateRef.current.dirty = true;
      if (statusRef.current === "running") return;
      const context = prepareCanvas(canvas, renderStateRef.current);
      drawGame(
        context,
        runtimeRef.current,
        logoRef.current,
        assetsRef.current,
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
      data-game-canvas
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          if (event.button === 0) beginJump();
          if (event.button === 2) duck();
          return;
        }

        event.preventDefault();
        const mobile = window.matchMedia("(max-width: 639px)").matches;
        const bounds = event.currentTarget.getBoundingClientRect();
        const useJump = mobile || event.clientX - bounds.left >= bounds.width / 2;
        touchGestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          triggered: !mobile && !useJump,
          jumping: useJump,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (useJump) beginJump();
        else duck();
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
        if (deltaY > 0) {
          gesture.jumping = false;
          cancelJumpAndDuck();
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") {
          releaseJump();
        } else if (touchGestureRef.current.pointerId === event.pointerId) {
          releaseJump();
          touchGestureRef.current.pointerId = -1;
          touchGestureRef.current.jumping = false;
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        releaseJump();
        touchGestureRef.current.pointerId = -1;
        touchGestureRef.current.jumping = false;
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`Campo di gioco. Tocca o fai click e mantieni la pressione per modulare il salto; scorri verso il basso o usa il click destro per abbassarti con ${team.nome}.`}
      className="block aspect-[9/5] w-full touch-none bg-[#020817] outline-none max-sm:aspect-auto max-sm:h-full"
    />
  );
}

export default memo(FantaRunner);

function prepareCanvas(
  canvas: HTMLCanvasElement,
  state: CanvasRenderState,
  force = false
) {
  if (!force && !state.dirty && state.context) return state.context;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, state.dprLimit);
  const pixelWidth = Math.max(1, Math.round(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(rect.height * pixelRatio));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = state.context ?? canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D non disponibile");
  context.setTransform(
    pixelWidth / state.logicalWidth,
    0,
    0,
    pixelHeight / state.logicalHeight,
    0,
    0
  );
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  state.context = context;
  state.dirty = false;
  return context;
}

function configureMobileRuntime(
  runtime: Runtime,
  renderState: CanvasRenderState,
  mobile: boolean
) {
  runtime.mobileLayout = mobile;
  runtime.mobileVisualScale = mobile ? MOBILE_EVENT_SCALE : 1;
  runtime.worldWidth = mobile ? MOBILE_GAME_WIDTH : GAME_WIDTH;
  renderState.logicalWidth = mobile ? MOBILE_GAME_WIDTH : GAME_WIDTH;
  renderState.logicalHeight = mobile ? MOBILE_GAME_HEIGHT : GAME_HEIGHT;
  renderState.dprLimit = mobile ? 1.6 : 1.5;
  renderState.dirty = true;
}

function updatePerformanceMonitor(
  monitor: PerformanceMonitor,
  runtime: Runtime,
  renderState: CanvasRenderState,
  time: number,
  renderTime: number
) {
  if (!monitor.windowStartedAt) monitor.windowStartedAt = time;
  monitor.frames += 1;
  monitor.renderTime += renderTime;
  const windowDuration = time - monitor.windowStartedAt;
  if (windowDuration < 2000) return;

  const averageFps = monitor.frames * 1000 / windowDuration;
  const averageFrameTime = monitor.renderTime / Math.max(1, monitor.frames);
  monitor.slowWindows = averageFps < 47
    ? monitor.slowWindows + 1
    : Math.max(0, monitor.slowWindows - 1);

  if (monitor.slowWindows >= 2 && !runtime.reducedPerformance) {
    runtime.reducedPerformance = true;
    renderState.dprLimit = runtime.mobileLayout ? 1.25 : 1;
    renderState.dirty = true;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    time - monitor.lastLogAt >= 5000
  ) {
    monitor.lastLogAt = time;
    console.debug("[FantaRunner performance]", {
      fps: Math.round(averageFps),
      entities: runtime.entities.length,
      particles: runtime.reducedPerformance ? 0 : runtime.burst?.type === "bonus" ? 8 : 0,
      averageFrameMs: Number(averageFrameTime.toFixed(2)),
      hudRendersPerSecond: Number((monitor.hudUpdates * 1000 / windowDuration).toFixed(1)),
      reducedMode: runtime.reducedPerformance,
      dprLimit: renderState.dprLimit,
    });
  }

  monitor.windowStartedAt = time;
  monitor.frames = 0;
  monitor.renderTime = 0;
  monitor.hudUpdates = 0;
}

function updateRuntime(runtime: Runtime, delta: number, time: number) {
  if (delta <= 0) return;

  runtime.elapsed += delta;
  if (time >= runtime.messageUntil) {
    runtime.message = "";
    runtime.messageTone = null;
  }
  if (time >= runtime.effectUntil) runtime.effect = null;
  if (runtime.presentation && time >= runtime.presentation.until) {
    runtime.presentation = null;
  }
  if (runtime.powerUpCollectionEffect && time >= runtime.powerUpCollectionEffect.until) {
    runtime.powerUpCollectionEffect = null;
  }
  updateActivePowerUps(runtime);

  if (
    runtime.elapsed >= INITIAL_PROTECTION_SECONDS &&
    !runtime.protectionEndNotified
  ) {
    runtime.protectionEndNotified = true;
    runtime.protectionAvailable = false;
  }

  runtime.peakScore = Math.max(runtime.peakScore, runtime.score);
  const difficulty = getDifficultyProgress(runtime);
  const difficultyBand = getDifficultyBand(runtime.teamRating);
  const speedProgress = getScoreSpeedProgress(runtime);
  const dybalaStrength = getPowerUpStrength(runtime, "dybala");
  const bossSpeedFactor = runtime.boss?.phase === "active" ? 0.82 : 1;
  const rafficaSpeedFactor = runtime.burst?.type === "malus" && runtime.burst.phase === "active" ? 0.91 : 1;
  const speed = getRunSpeed(speedProgress) *
    (1 - dybalaStrength * 0.64) * bossSpeedFactor * rafficaSpeedFactor;
  const worldSpeed = Math.min(speed, 590);
  const groundVisualSpeed = Math.min(
    speed * BACKGROUND_TRANSITION_CONFIG.groundSpeedFactor,
    BACKGROUND_TRANSITION_CONFIG.maximumGroundSpeed
  );
  runtime.groundOffset += groundVisualSpeed * delta;
  runtime.stadiumOffset +=
    Math.min(
      speed * BACKGROUND_TRANSITION_CONFIG.stadiumSpeedFactor,
      BACKGROUND_TRANSITION_CONFIG.maximumStadiumSpeed
    ) * delta;
  runtime.visualComfort = clamp01(
    (speed - BACKGROUND_TRANSITION_CONFIG.visualComfortStartSpeed) /
      Math.max(1, SPEED_CONFIG.maximum - BACKGROUND_TRANSITION_CONFIG.visualComfortStartSpeed)
  );

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
  if (
    runtime.jumpHeld &&
    runtime.jumpHoldRemaining > 0 &&
    runtime.velocityY < 0
  ) {
    const holdDelta = Math.min(delta, runtime.jumpHoldRemaining);
    runtime.velocityY += JUMP_HOLD_ACCELERATION *
      (runtime.mobileLayout ? 1.12 : 1) *
      (1 + getPowerUpStrength(runtime, "lukaku") * 0.2) *
      holdDelta;
    runtime.jumpHoldRemaining -= holdDelta;
    if (runtime.jumpHoldRemaining <= 0) runtime.jumpHeld = false;
  }
  runtime.velocityY += GRAVITY * delta;
  runtime.playerY = Math.max(8, Math.min(
    PLAYER_GROUND_Y,
    runtime.playerY + runtime.velocityY * delta
  ));
  if (runtime.playerY <= 8 && runtime.velocityY < 0) runtime.velocityY = 0;
  if (runtime.playerY >= PLAYER_GROUND_Y) {
    runtime.playerY = PLAYER_GROUND_Y;
    runtime.velocityY = 0;
    runtime.grounded = true;
    runtime.jumpHeld = false;
    runtime.jumpHoldRemaining = 0;
  }

  runtime.distance += speed * delta * 0.01;
  runtime.flowProgress += FLOW_PROGRESS_PER_SECOND * delta;

  if (
    !runtime.firstPowerUpSpawned &&
    runtime.distance >= POWER_UP_SPAWN_CONFIG.guaranteedDistanceStart
  ) {
    trySpawnPowerUp(runtime, true);
  }

  if (runtime.flowProgress >= 100) {
    runtime.flowProgress -= 100;
  }
  runtime.score +=
    delta * (36 + speed * 0.04 + getSpeedLevel(difficulty) * 4) * runtime.multiplier;
  runtime.malusBurstCooldown = Math.max(0, runtime.malusBurstCooldown - delta);
  runtime.bonusBurstCooldown = Math.max(0, runtime.bonusBurstCooldown - delta);
  runtime.mutualBurstCooldown = Math.max(0, runtime.mutualBurstCooldown - delta);
  runtime.powerUpCooldown = Math.max(0, runtime.powerUpCooldown - delta);
  updateBoss(runtime, delta, difficulty, time);
  updateRaffica(runtime, delta, speed, difficulty);
  updateRafficaOverlay(runtime, delta);
  runtime.spawnTimer -= delta * (1 - dybalaStrength * 0.52);

  if (runtime.spawnTimer <= 0 && !runtime.burst && !runtime.boss) {
    if (tryStartRaffica(runtime, time)) {
      runtime.spawnTimer = 0.5;
    } else if (trySpawnPowerUp(runtime, false)) {
      runtime.spawnTimer = getSafeSpawnInterval(speed, difficulty) * 1.15;
    } else {
      const sequenceDelay = spawnNext(runtime, speed, difficulty);
      const openingIntervalMultiplier = runtime.distance < SPAWN_CONFIG.openingBonus.distanceEndMeters
        ? SPAWN_CONFIG.openingBonus.intervalMultiplier
        : 1;
      runtime.spawnTimer =
        getSafeSpawnInterval(speed, difficulty) *
          difficultyBand.intervalMultiplier *
          openingIntervalMultiplier +
        sequenceDelay;
    }
  }

  for (const entity of runtime.entities) {
    if (entity.type === "physical" && entity.motion === "launched") {
      entity.x += ((entity.velocityX ?? 440) - worldSpeed * 0.22) * delta;
      entity.velocityY = (entity.velocityY ?? -210) + GRAVITY * 0.72 * delta;
      entity.y += entity.velocityY * delta;
      entity.rotation = (entity.rotation ?? 0) + (entity.angularVelocity ?? 4.5) * delta;
    } else if (entity.type === "event" && entity.motion === "bossProjectile") {
      entity.x += (entity.velocityX ?? -360) * delta;
      entity.y += (entity.velocityY ?? 0) * delta;
      entity.rotation = (entity.rotation ?? 0) + (entity.angularVelocity ?? 0) * delta;
    } else {
      const motionPhase = runtime.elapsed * (entity.motionSpeed ?? 1.5) + (entity.phase ?? 0);
      entity.x -= worldSpeed * (entity.horizontalSpeedFactor ?? 1) * delta;
      entity.rotation =
        (entity.rotation ?? 0) + (entity.angularVelocity ?? 0) * delta;

      if (entity.type === "event" && entity.motion === "floating") {
        const originY = entity.originY ?? entity.y;
        entity.y = Math.min(
          GROUND_Y - entity.height,
          Math.max(
            GROUND_Y - entity.height - 128,
            originY + Math.sin(motionPhase) * (entity.amplitude ?? 16)
          )
        );
      } else if (
        entity.type === "event" &&
        (entity.motion === "sine" || entity.motion === "serpentine")
      ) {
        const originY = entity.originY ?? entity.y;
        const serpentineFactor = entity.motion === "serpentine" ? 1.25 : 0.55;
        entity.y = Math.min(
          GROUND_Y - entity.height,
          Math.max(
            GROUND_Y - entity.height - 128,
            originY + Math.sin(motionPhase * 0.84) * (entity.amplitude ?? 18) * serpentineFactor
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

    entity.fleeing = false;
    if (
      entity.type === "event" &&
      EVENT_DEFINITIONS[entity.kind as EventKind].category === "bonus"
    ) {
      const playerCenterY = runtime.playerY + PLAYER_SIZE / 2;
      const entityCenterY = entity.y + entity.height / 2;
      const horizontalDistance = entity.x - runtime.playerX;
      const nicoStrength = getPowerUpStrength(runtime, "nico-paz");
      const gimenezStrength = getPowerUpStrength(runtime, "gimenez");
      if (nicoStrength > 0 && horizontalDistance > 0 && horizontalDistance < 400) {
        const blockingObstacle = findBlockingObstacle(runtime, entity);
        const targetY = blockingObstacle
          ? Math.max(GROUND_Y - entity.height - 128, blockingObstacle.y - entity.height - 14)
          : playerCenterY - entity.height / 2;
        entity.y += (targetY - entity.y) * Math.min(1, delta * 5.4 * nicoStrength);
        if (!blockingObstacle) {
          entity.x -= worldSpeed * delta * (0.28 + (1 - clamp01(horizontalDistance / 400)) * 0.16) * nicoStrength;
        }
      }
      const alreadyVanishing = (entity.opacity ?? 1) < 1;
      if (
        (gimenezStrength > 0 || alreadyVanishing) &&
        (alreadyVanishing || (horizontalDistance > -20 && horizontalDistance < 150))
      ) {
        const dissolveStrength = gimenezStrength > 0 ? gimenezStrength : 1;
        const direction = entityCenterY <= playerCenterY ? -1 : 1;
        const proximity = 1 - clamp01(Math.max(0, horizontalDistance) / 150);
        entity.fleeing = true;
        entity.opacity = Math.max(0, (entity.opacity ?? 1) - delta * (1.8 + proximity * 0.8) * dissolveStrength);
        entity.y = Math.max(
          GROUND_Y - entity.height - 120,
          Math.min(
            GROUND_Y - entity.height,
            entity.y + direction * (42 + proximity * 38) * delta * dissolveStrength
          )
        );
        entity.x += worldSpeed * (0.95 + proximity * 0.25) * delta * dissolveStrength;
      }
    }
  }

  if (runtime.velocityY >= 0) {
    const previousBottom = previousPlayerY + PLAYER_SIZE;
    const proposedBottom = runtime.playerY + PLAYER_SIZE;
    let landingTop: number | null = null;

    for (const entity of runtime.entities) {
      if (entity.type !== "physical" || entity.motion === "launched") continue;
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

  const remainingEntities = runtime.entityScratch;
  remainingEntities.length = 0;
  for (const entity of runtime.entities) {
    const entityRect = entity.type === "physical"
      ? getObstacleHitbox(entity)
      : entity.type === "powerup"
        ? getPowerUpHitbox(entity)
        : getEventHitbox(entity);
    const collisionPlayerRect =
      entity.type === "event" &&
      EVENT_DEFINITIONS[entity.kind as EventKind].category === "bonus"
        ? expandRect(playerRect, 10 * getPowerUpStrength(runtime, "lukaku"))
        : playerRect;
    const protectedByGimenez =
      entity.type === "event" &&
      EVENT_DEFINITIONS[entity.kind as EventKind].category === "bonus" &&
      (getPowerUpStrength(runtime, "gimenez") > 0 || entity.fleeing);
    const launchedObstacle = entity.type === "physical" && entity.motion === "launched";
    const hit = !protectedByGimenez && !launchedObstacle && intersects(collisionPlayerRect, entityRect);

    if (hit) {
      if (entity.type === "event") {
        applyEvent(runtime, entity.kind as EventKind, time);
        releaseEntity(runtime, entity);
        continue;
      } else if (entity.type === "powerup") {
        activatePowerUp(runtime, entity.kind as PowerUpKind, time);
        releaseEntity(runtime, entity);
        continue;
      } else {
        if (getPowerUpStrength(runtime, "lukaku") > 0) {
          launchObstacle(runtime, entity, time);
          remainingEntities.push(entity);
          continue;
        }
        const playerHitboxOffset = playerRect.x - runtime.playerX;
        runtime.playerX = Math.min(
          runtime.playerX,
          entityRect.x - playerHitboxOffset - playerRect.width
        );
        runtime.blockedObstacleId = entity.id;

        if (!entity.alreadyHit) {
          applyPhysicalHit(runtime, time, false);
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

    if (entity.fleeing && (entity.opacity ?? 1) <= 0.02) {
      releaseEntity(runtime, entity);
    } else if (
      entity.motion === "launched" &&
      (entity.x > runtime.worldWidth + 180 || entity.y > GROUND_Y + 180)
    ) {
      releaseEntity(runtime, entity);
    } else if (entity.x + entity.width > -40) remainingEntities.push(entity);
    else releaseEntity(runtime, entity);
  }
  runtime.entityScratch = runtime.entities;
  runtime.entities = remainingEntities;

  if (runtime.playerX + PLAYER_SIZE < 0 && !runtime.finished) {
    runtime.gameOverReason = "Sei rimasto indietro";
    runtime.effect = "hit";
    runtime.finished = true;
  }

  const remainingPits = runtime.pitScratch;
  remainingPits.length = 0;
  const playerCenter = runtime.playerX + PLAYER_SIZE / 2;
  const nearGround = runtime.grounded && runtime.playerY > PLAYER_GROUND_Y - 3;

  for (const pit of runtime.pits) {
    pit.x -= worldSpeed * delta;
    if (
      nearGround &&
      playerCenter > pit.x + 4 &&
      playerCenter < pit.x + pit.width - 4
    ) {
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
  runtime.pitScratch = runtime.pits;
  runtime.pits = remainingPits;

  updateBackgroundState(runtime, delta);

  if (runtime.teamRating < TEAM_RATING_THRESHOLD && !runtime.finished) {
    runtime.gameOverReason = `Voto squadra sotto ${TEAM_RATING_THRESHOLD}`;
    runtime.finished = true;
  }
}

function updateBackgroundState(runtime: Runtime, delta: number) {
  const desiredStage = getBackgroundStageForDistance(
    runtime.distance,
    SCENARIO_DISTANCE_METERS
  );
  const activeTarget = runtime.backgroundTransition?.to ?? runtime.backgroundStage;

  if ((runtime.burst || runtime.boss) && !runtime.backgroundTransition && desiredStage !== activeTarget) {
    return;
  }

  if (desiredStage !== activeTarget) {
    const from = runtime.backgroundTransition && runtime.backgroundTransition.progress >= 0.5
      ? runtime.backgroundTransition.to
      : runtime.backgroundStage;
    if (desiredStage === from) {
      runtime.backgroundStage = from;
      runtime.backgroundTransition = null;
      return;
    }
    runtime.backgroundTransition = {
      from,
      to: desiredStage,
      progress: 0,
      duration: BACKGROUND_TRANSITION_CONFIG.fadeDurationSeconds,
    };
  }

  const transition = runtime.backgroundTransition;
  if (!transition) return;
  transition.progress = Math.min(1, transition.progress + delta / transition.duration);
  if (transition.progress >= 1) {
    runtime.backgroundStage = transition.to;
    runtime.backgroundTransition = null;
  }
}

function tryStartRaffica(
  runtime: Runtime,
  time: number
) {
  if (
    runtime.burst ||
    runtime.boss ||
    runtime.backgroundTransition ||
    runtime.entities.some((entity) => entity.type === "powerup") ||
    runtime.distance < SPAWN_CONFIG.openingBonus.distanceEndMeters ||
    runtime.mutualBurstCooldown > 0 ||
    runtime.elapsed < runtime.nextBurstEligibleAt
  ) return false;

  const canStartMalus =
    runtime.elapsed >= RAFFICA_CONFIG.malus.minimumStartSeconds &&
    runtime.malusBurstCooldown <= 0;
  const canStartBonus =
    runtime.elapsed >= RAFFICA_CONFIG.bonus.minimumStartSeconds &&
    runtime.bonusBurstCooldown <= 0;
  if (!canStartMalus && !canStartBonus) return false;

  const forced = runtime.elapsed >= runtime.nextForcedBurstAt;
  const windowLength = Math.max(
    1,
    runtime.nextForcedBurstAt - runtime.nextBurstEligibleAt
  );
  const windowProgress = Math.max(
    0,
    Math.min(1, (runtime.elapsed - runtime.nextBurstEligibleAt) / windowLength)
  );
  const progressiveChance =
    RAFFICA_CONFIG.progressiveChance.minimum +
    (RAFFICA_CONFIG.progressiveChance.maximum - RAFFICA_CONFIG.progressiveChance.minimum) *
      Math.pow(windowProgress, RAFFICA_CONFIG.progressiveChance.curvePower);
  if (!forced && Math.random() >= progressiveChance) return false;

  const preferMalus = Math.random() < getDynamicMalusShare(runtime.teamRating);
  const type: RafficaType | null = preferMalus
    ? canStartMalus ? "malus" : canStartBonus ? "bonus" : null
    : canStartBonus ? "bonus" : canStartMalus ? "malus" : null;
  if (!type) return false;

  const config = RAFFICA_CONFIG[type];
  runtime.burst = {
    type,
    phase: "warning",
    timer: config.warningSeconds,
    durationRemaining:
      config.minimumDurationSeconds +
      Math.random() * (config.maximumDurationSeconds - config.minimumDurationSeconds),
    index: 0,
    hatTrickSpawned: false,
    pattern: pickRafficaPattern(type),
    beatIndex: 0,
    beatItemIndex: 0,
  };
  runtime.burstOverlayType = type;
  runtime.presentation = {
    asset: RAFFICA_PRESENTATION_ASSETS[type],
    title: type === "malus" ? "Raffica di Malus" : "Raffica di Bonus",
    subtitle: type === "malus" ? "Resisti alla pressione" : "Precisione e tempismo",
    tone: type,
    until: time + 4500,
  };
  return true;
}

function updateRaffica(
  runtime: Runtime,
  delta: number,
  speed: number,
  difficulty: number
) {
  const burst = runtime.burst;
  if (!burst) return;

  burst.timer -= delta;
  if (burst.phase === "warning") {
    if (burst.timer > 0) return;
    burst.phase = "active";
    burst.timer = 0;
  }

  burst.durationRemaining = Math.max(0, burst.durationRemaining - delta);
  if (burst.durationRemaining <= 0) {
    finishRaffica(runtime, burst.type);
    return;
  }

  if (burst.timer > 0) return;
  let beat = burst.pattern[burst.beatIndex];
  if (!beat) {
    burst.beatIndex = 0;
    burst.beatItemIndex = 0;
    burst.timer = 0.95;
    return;
  }
  if (beat.category === "pause") {
    burst.beatIndex += 1;
    burst.beatItemIndex = 0;
    burst.timer = beat.gap ?? 0.9;
    return;
  }

  const spawnType: RafficaType = beat.category === "primary"
    ? burst.type
    : burst.type === "malus" ? "bonus" : "malus";
  let kind: EventKind;
  let heightLevel: 0 | 1 | 2;
  let motion: RunnerEntity["motion"];

  if (spawnType === "malus") {
    kind = weightedRafficaPick(MALUS_RAFFICA_POOL);
    heightLevel = Math.random() < 0.78 ? 0 : 1;
    const motionRoll = Math.random();
    motion = motionRoll < 0.42 ? "ground" : motionRoll < 0.7 ? "diagonal" : "serpentine";
  } else {
    const canSpawnHatTrick =
      beat.category === "primary" &&
      !burst.hatTrickSpawned &&
      Math.random() < RAFFICA_CONFIG.bonus.hatTrickChance;
    kind = canSpawnHatTrick ? "hatTrick" : weightedRafficaPick(BONUS_RAFFICA_POOL);
    const heightRoll = Math.random();
    heightLevel = heightRoll < 0.34 ? 0 : heightRoll < 0.7 ? 1 : 2;
    motion = Math.random() < 0.18 ? "floating" : "ground";
  }

  const burstStartX = runtime.worldWidth + Math.max(34, speed * (0.035 + Math.random() * 0.065));
  const pushed = pushEvent(
    runtime,
    kind,
    burstStartX,
    heightLevel,
    {
      burst: true,
      motion,
      amplitude: motion === "serpentine" || motion === "floating" ? 11 + difficulty * 7 : undefined,
      motionSpeed: 1.05 + difficulty * 0.55,
      horizontalSpeedFactor: 1,
    }
  );

  if (!pushed) {
    burst.timer = 0.16;
    return;
  }

  if (kind === "hatTrick") burst.hatTrickSpawned = true;
  burst.index += 1;
  burst.beatItemIndex += 1;
  if (burst.beatItemIndex >= beat.count) {
    burst.beatIndex += 1;
    burst.beatItemIndex = 0;
    beat = burst.pattern[burst.beatIndex];
    if (beat?.category === "pause") {
      burst.beatIndex += 1;
      burst.timer = beat.gap ?? 0.9;
      return;
    }
  }
  const config = RAFFICA_CONFIG[spawnType];
  const baseInterval =
    config.maximumItemInterval -
    (config.maximumItemInterval - config.minimumItemInterval) *
      difficulty;
  const groupPulse = 0.76 + Math.random() * 0.34;
  burst.timer = Math.max(
    spawnType === "malus" ? 0.28 : 0.2,
    baseInterval * groupPulse
  );
}

function pickRafficaPattern(type: RafficaType) {
  const patterns = RAFFICA_PATTERNS[type];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function finishRaffica(runtime: Runtime, type: RafficaType) {
  runtime.burst = null;
  runtime.mutualBurstCooldown = RAFFICA_CONFIG.mutualCooldownSeconds;
  if (type === "malus") {
    runtime.malusBurstCooldown = RAFFICA_CONFIG.malus.cooldownSeconds * (0.9 + Math.random() * 0.2);
  } else {
    runtime.bonusBurstCooldown = RAFFICA_CONFIG.bonus.cooldownSeconds * (0.9 + Math.random() * 0.2);
  }
  runtime.nextBurstEligibleAt = runtime.elapsed + RAFFICA_CONFIG.mutualCooldownSeconds;
  runtime.nextForcedBurstAt = runtime.elapsed + randomBetween(
    RAFFICA_CONFIG.repeatForcedDelay.minimum,
    RAFFICA_CONFIG.repeatForcedDelay.maximum
  );
}

function trySpawnPowerUp(runtime: Runtime, guaranteed: boolean) {
  const spawnChance = runtime.distance < SPAWN_CONFIG.openingBonus.distanceEndMeters
    ? POWER_UP_SPAWN_CONFIG.openingChancePerSpawnOpportunity
    : POWER_UP_SPAWN_CONFIG.chancePerSpawnOpportunity;
  if (
    (!guaranteed && runtime.elapsed < POWER_UP_SPAWN_CONFIG.minimumStartSeconds) ||
    runtime.powerUpCooldown > 0 ||
    runtime.presentation ||
    runtime.burst ||
    runtime.boss ||
    (!guaranteed && Math.random() >= spawnChance) ||
    runtime.entities.some((entity) => entity.type === "powerup")
  ) return false;
  const definition = pickPowerUp();
  const scale = runtime.mobileLayout ? MOBILE_POWER_UP_SCALE : 1;
  const width = definition.width * scale;
  const height = definition.height * scale;
  const y = GROUND_Y - height - (guaranteed ? 30 : Math.random() < 0.55 ? 34 : 78);
  const x = runtime.worldWidth + (guaranteed ? 54 : 70);
  const safetyMargin = guaranteed ? 86 : 52;
  if (runtime.entities.some((entity) =>
    entity.type === "physical" &&
    x < entity.x + entity.width + safetyMargin &&
    x + width > entity.x - safetyMargin
  )) return false;
  const entity = acquireEntity(runtime, "powerup", definition.kind, x, y, width, height);
  entity.motion = "floating";
  entity.originY = y;
  entity.amplitude = 8;
  entity.motionSpeed = 1.05;
  entity.horizontalSpeedFactor = 0.92;
  runtime.entities.push(entity);
  runtime.powerUpCooldown = POWER_UP_SPAWN_CONFIG.cooldownSeconds;
  runtime.firstPowerUpSpawned = true;
  return true;
}

function activatePowerUp(runtime: Runtime, kind: PowerUpKind, time: number) {
  const definition = POWER_UP_CONFIG[kind];
  runtime.activePowerUps[kind] = {
    expiresAt: runtime.elapsed + definition.durationSeconds,
    charges: 0,
  };
  runtime.powerUpCollectionEffect = { kind, until: time + 820 };
  runtime.presentation = {
    asset: definition.banner,
    title: definition.name,
    subtitle: definition.effect,
    tone: kind === "gimenez" ? "malus" : "bonus",
    until: time + 4500,
  };
}

function updateActivePowerUps(runtime: Runtime) {
  for (const kind of POWER_UP_KINDS) {
    const active = runtime.activePowerUps[kind];
    if (!active || runtime.elapsed < active.expiresAt) continue;
    delete runtime.activePowerUps[kind];
  }
}

function getPowerUpStrength(runtime: Runtime, kind: PowerUpKind) {
  const active = runtime.activePowerUps[kind];
  if (!active) return 0;
  const remaining = active.expiresAt - runtime.elapsed;
  if (remaining <= 0) return 0;
  return Math.min(1, remaining / 1.25);
}

function updateBoss(
  runtime: Runtime,
  delta: number,
  difficulty: number,
  time: number
) {
  if (!runtime.boss) {
    if (
      runtime.elapsed < runtime.nextBossAt ||
      runtime.burst ||
      runtime.entities.some((entity) => entity.type === "powerup") ||
      runtime.backgroundTransition
      || runtime.distance < SPAWN_CONFIG.openingBonus.distanceEndMeters
    ) return;
    runtime.boss = {
      phase: "warning",
      timer: BOSS_CONFIG.warningSeconds,
      spawnTimer: 0,
      lastShotAt: -10,
    };
    runtime.presentation = {
      asset: BOSS_CONFIG.warningAsset,
      title: "Boss 20 in arrivo",
      subtitle: "Non farti trascinare in fondo",
      tone: "malus",
      until: time + BOSS_CONFIG.warningSeconds * 1000,
    };
    return;
  }

  const boss = runtime.boss;
  boss.timer -= delta;
  if (boss.phase === "exiting") {
    if (boss.timer <= 0) runtime.boss = null;
    return;
  }
  if (boss.phase === "warning") {
    if (boss.timer > 0) return;
    boss.phase = "active";
    boss.timer = BOSS_CONFIG.durationSeconds;
    boss.spawnTimer = 0.65;
    runtime.presentation = {
      asset: BOSS_CONFIG.bannerAsset,
      title: "Boss 20",
      subtitle: "Sopravvivi per conquistare +3",
      tone: "malus",
      until: time + 4500,
    };
    return;
  }

  boss.spawnTimer -= delta;
  if (boss.spawnTimer <= 0) {
    let activeProjectiles = 0;
    for (const entity of runtime.entities) {
      if (entity.type === "event" && entity.motion === "bossProjectile") {
        activeProjectiles += 1;
      }
    }
    if (runtime.mobileLayout && activeProjectiles >= 3) {
      boss.spawnTimer = 0.24;
      return;
    }
    const kind = weightedRafficaPick(MALUS_RAFFICA_POOL);
    if (runtime.mobileLayout) {
      const bossRect = getBossRect(runtime);
      const eventDimensions = getEventDimensions(kind);
      const spawnX = bossRect.x + bossRect.width * 0.18;
      const spawnY = bossRect.y + bossRect.height * 0.52 - eventDimensions.height * MOBILE_EVENT_SCALE / 2;
      const targetX = runtime.playerX + PLAYER_SIZE * 0.55;
      const targetY = runtime.playerY + PLAYER_SIZE * 0.52;
      const deltaX = targetX - spawnX;
      const deltaY = targetY - spawnY;
      const vectorLength = Math.max(1, Math.hypot(deltaX, deltaY));
      const projectileSpeed = 265 + difficulty * 55;
      pushEvent(runtime, kind, spawnX, 0, {
        burst: true,
        spawnY,
        motion: "bossProjectile",
        velocityX: deltaX / vectorLength * projectileSpeed,
        velocityY: deltaY / vectorLength * projectileSpeed,
        angularVelocity: (Math.random() - 0.5) * 2.2,
      });
    } else {
      const projectileMotion: RunnerEntity["motion"] = Math.random() < 0.5
        ? "diagonal"
        : "serpentine";
      pushEvent(runtime, kind, runtime.worldWidth - 205 + Math.random() * 24, Math.random() < 0.7 ? 0 : 1, {
        burst: true,
        spawnY: 205 + Math.random() * 105,
        motion: projectileMotion,
        amplitude: 72 + Math.random() * 42,
        motionSpeed: 1.05 + difficulty * 0.42,
        horizontalSpeedFactor: 1.5 + Math.random() * 0.18,
      });
    }
    boss.lastShotAt = runtime.elapsed;
    boss.spawnTimer = randomBetween(
      BOSS_CONFIG.itemIntervalSeconds.minimum,
      BOSS_CONFIG.itemIntervalSeconds.maximum
    );
  }
  if (boss.timer > 0) return;

  boss.phase = "exiting";
  boss.timer = 0.7;
  boss.spawnTimer = Number.POSITIVE_INFINITY;
  runtime.nextBossAt = runtime.elapsed + BOSS_CONFIG.cooldownSeconds;
  changeTeamRating(runtime, BOSS_CONFIG.rewardRating, time, "boss-reward", "Boss 20 superato");
  runtime.presentation = null;
}

function updateRafficaOverlay(runtime: Runtime, delta: number) {
  const activeType = runtime.burst?.type ?? null;
  const target = activeType ? RAFFICA_CONFIG[activeType].overlayOpacity : 0;
  runtime.burstOverlayIntensity +=
    (target - runtime.burstOverlayIntensity) *
    Math.min(1, delta * RAFFICA_CONFIG.overlayResponse);
  if (!activeType && runtime.burstOverlayIntensity < 0.001) {
    runtime.burstOverlayIntensity = 0;
    runtime.burstOverlayType = null;
  }
}

function weightedRafficaPick(pool: Array<{ kind: EventKind; weight: number }>) {
  let cursor = Math.random() * pool.reduce((sum, item) => sum + item.weight, 0);
  for (const item of pool) {
    cursor -= item.weight;
    if (cursor <= 0) return item.kind;
  }
  return pool[pool.length - 1].kind;
}

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum);
}

function getDynamicMalusShare(teamRating: number) {
  const balance = RAFFICA_CONFIG.dynamicMalusShare;
  if (teamRating < 70) {
    const progress = clamp01((teamRating - TEAM_RATING_THRESHOLD) / (70 - TEAM_RATING_THRESHOLD));
    return balance.lowRating + (balance.neutralRating - balance.lowRating) * progress;
  }
  const progress = clamp01((teamRating - 70) / 20);
  return balance.neutralRating +
    (balance.highRatingMaximum - balance.neutralRating) * progress;
}

function getVisibleBackgroundStage(runtime: Runtime) {
  const transition = runtime.backgroundTransition;
  return transition && transition.progress >= 0.5
    ? transition.to
    : transition?.from ?? runtime.backgroundStage;
}

function spawnNext(runtime: Runtime, speed: number, difficulty: number) {
  if (runtime.entities.length >= ENTITY_DENSITY_CONFIG.maximumActiveEntities) {
    return 0;
  }
  const decision = createSpawnDecision({
    elapsed: runtime.elapsed,
    distance: runtime.distance,
    difficulty,
    teamRating: runtime.teamRating,
  });
  const startX = runtime.worldWidth + Math.max(runtime.mobileLayout ? 70 : 40, speed * (runtime.mobileLayout ? 0.14 : 0.08));

  if (decision.type === "breather") {
    runtime.lastSpawnCategory = "space";
    runtime.repeatedSpawnCategory = 0;
    return 0;
  }

  const spawnCategory = decision.type === "event"
    ? decision.event.category
    : "physical";
  if (runtime.lastSpawnCategory === spawnCategory) {
    runtime.repeatedSpawnCategory += 1;
    if (runtime.repeatedSpawnCategory >= 2) {
      runtime.lastSpawnCategory = "space";
      runtime.repeatedSpawnCategory = 0;
      return 0;
    }
  } else {
    runtime.lastSpawnCategory = spawnCategory;
    runtime.repeatedSpawnCategory = 0;
  }

  if (decision.type === "pit") {
    if (runtime.pits.length >= ENTITY_DENSITY_CONFIG.maximumActivePits) return 0;
    runtime.pits.push({
      id: runtime.nextEntityId++,
      x: startX,
      width: decision.width,
      stage: getVisibleBackgroundStage(runtime),
    });
    if (decision.bonus) {
      const bonusDimensions = getEventDimensions(decision.bonus.kind);
      pushEvent(runtime, decision.bonus.kind, startX + decision.width / 2 - bonusDimensions.width / 2, 1, {
        motion: "floating",
        amplitude: 12,
        motionSpeed: 1.35,
      });
    }
    return 0;
  }

  if (decision.type === "sequence") {
    const actionWindow = runtime.mobileLayout
      ? 1.16 - difficulty * 0.18
      : 0.98 - difficulty * 0.24;
    const gap = speed * actionWindow + (runtime.mobileLayout ? 150 : 135);
    decision.kinds.forEach((kind, index) => {
      pushPhysicalObstacle(runtime, kind, startX + gap * index, difficulty);
    });
    return (gap * (decision.kinds.length - 1)) / speed;
  }

  if (decision.type === "physical") {
    pushPhysicalObstacle(runtime, decision.kind, startX, difficulty);
    if (decision.bonus) {
      const dimensions = getPhysicalDimensions(decision.kind);
      const bonusDimensions = getEventDimensions(decision.bonus.kind);
      const isTall = decision.kind === "cornerFlag" || decision.kind === "var";
      pushEvent(
        runtime,
        decision.bonus.kind,
        isTall
          ? startX + dimensions.width + 68
          : startX + dimensions.width / 2 - bonusDimensions.width / 2,
        isTall ? 0 : 1,
        { motion: "floating", amplitude: 10, motionSpeed: 1.2 }
      );
    }
    return 0;
  }

  const trail = Math.max(1, decision.trail ?? 1);
  const eventDimensions = getEventDimensions(decision.event.kind);
  for (let index = 0; index < trail; index += 1) {
    const heightOffset = (decision.trailRise ?? 0) * index;
    pushEvent(
      runtime,
      decision.event.kind,
      startX + (decision.xOffset ?? 0) + index * (eventDimensions.width + 24),
      decision.heightLevel,
      {
        motion: decision.motion,
        amplitude: decision.amplitude,
        motionSpeed: decision.motionSpeed,
        heightOffset,
        horizontalSpeedFactor: decision.horizontalSpeedFactor,
        angularVelocity: decision.angularVelocity,
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
    motion?: RunnerEntity["motion"];
    amplitude?: number;
    motionSpeed?: number;
    heightOffset?: number;
    burst?: boolean;
    horizontalSpeedFactor?: number;
    angularVelocity?: number;
    spawnY?: number;
    velocityX?: number;
    velocityY?: number;
  } = {}
) {
  const eventCount = runtime.entities.reduce(
    (count, entity) => count + (entity.type === "event" ? 1 : 0),
    0
  );
  const maximumEvents = options.burst
    ? ENTITY_DENSITY_CONFIG.maximumActiveCollectiblesDuringBurst
    : ENTITY_DENSITY_CONFIG.maximumActiveCollectibles;
  if (
    eventCount >= maximumEvents ||
    runtime.entities.length >= ENTITY_DENSITY_CONFIG.maximumActiveEntities
  ) {
    return false;
  }

  const minimumDistance = options.burst
    ? ENTITY_DENSITY_CONFIG.burstCollectibleDistance
    : ENTITY_DENSITY_CONFIG.minimumCollectibleDistance;
  const baseDimensions = getEventDimensions(kind);
  const dimensions = {
    width: baseDimensions.width * runtime.mobileVisualScale,
    height: baseDimensions.height * runtime.mobileVisualScale,
  };
  if (
    runtime.entities.some(
      (entity) =>
        entity.type === "event" &&
        Math.abs(entity.x - x) <
          minimumDistance + Math.min(entity.width, dimensions.width) * 0.5
    )
  ) {
    return false;
  }

  const definition = EVENT_DEFINITIONS[kind];
  const levelOffset = definition.category === "bonus"
    ? BONUS_HEIGHT_OFFSETS[heightLevel]
    : heightLevel === 2 ? 106 : heightLevel === 1 ? 58 : 0;
  const targetY = Math.max(
    GROUND_Y - dimensions.height - 128,
    Math.min(
      GROUND_Y - dimensions.height,
      GROUND_Y - dimensions.height - levelOffset - (options.heightOffset ?? 0)
    )
  );
  if (
    runtime.entities.some((entity) => {
      if (entity.type !== "physical") return false;
      const margin = 10;
      return x < entity.x + entity.width + margin &&
        x + dimensions.width > entity.x - margin &&
        targetY < entity.y + entity.height + margin &&
        targetY + dimensions.height > entity.y - margin;
    })
  ) {
    return false;
  }

  if (kind === "hatTrick") {
    const maximumHatTricks = runtime.elapsed >= ENTITY_DENSITY_CONFIG.hatTrickThirdAppearanceSeconds
      ? ENTITY_DENSITY_CONFIG.hatTrickLongRunLimit
      : ENTITY_DENSITY_CONFIG.hatTrickRegularLimit;
    if (runtime.hatTricksSpawned >= maximumHatTricks) return false;
    runtime.hatTricksSpawned += 1;
  }

  const motion = options.motion ?? "ground";
  const entity = acquireEntity(runtime, "event", kind, x, options.spawnY ?? targetY, dimensions.width, dimensions.height);
  entity.motion = motion;
  entity.velocityX = options.velocityX;
  entity.velocityY = motion === "bossProjectile"
    ? options.velocityY
    : motion === "diagonal"
        ? 48 + (options.motionSpeed ?? 1) * 12
        : undefined;
  entity.originY = options.spawnY ?? targetY;
  entity.amplitude = options.amplitude;
  entity.phase = runtime.nextEntityId * 0.71;
  entity.motionSpeed = options.motionSpeed;
  entity.horizontalSpeedFactor = options.horizontalSpeedFactor;
  entity.rotation = 0;
  entity.angularVelocity = options.angularVelocity;
  runtime.entities.push(entity);
  return true;
}

function pushPhysicalObstacle(
  runtime: Runtime,
  kind: PhysicalObstacleKind,
  x: number,
  difficulty: number
) {
  const physicalCount = runtime.entities.reduce(
    (count, entity) => count + (entity.type === "physical" ? 1 : 0),
    0
  );
  if (
    physicalCount >= ENTITY_DENSITY_CONFIG.maximumActivePhysicalObstacles ||
    runtime.entities.length >= ENTITY_DENSITY_CONFIG.maximumActiveEntities
  ) {
    return false;
  }
  const baseDimensions = getPhysicalDimensions(kind);
  const obstacleScale = runtime.mobileLayout ? MOBILE_OBSTACLE_SCALE[kind] : 1;
  const dimensions = {
    width: baseDimensions.width * obstacleScale,
    height: baseDimensions.height * obstacleScale,
  };
  const clearance = runtime.mobileLayout ? 125 : 72;
  if (runtime.entities.some((entity) =>
    entity.type === "physical" &&
    Math.abs(entity.x - x) < (entity.width + dimensions.width) / 2 + clearance
  )) {
    return false;
  }
  const movingObstacle = kind === "slidingTackle";
  const entity = acquireEntity(runtime, "physical", kind, x, GROUND_Y - dimensions.height, dimensions.width, dimensions.height);
  entity.alreadyHit = false;
  entity.rewarded = false;
  entity.motion = movingObstacle ? "rush" : "ground";
  entity.horizontalSpeedFactor =
      movingObstacle
        ? 1.24 + difficulty * 0.56 + Math.random() * 0.16
        : 1;
  entity.rotation = movingObstacle ? -0.045 : 0;
  entity.angularVelocity = movingObstacle ? 0.035 + Math.random() * 0.035 : 0;
  runtime.entities.push(entity);
  return true;
}

function acquireEntity(
  runtime: Runtime,
  type: RunnerEntity["type"],
  kind: RunnerEntity["kind"],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const entity = runtime.entityPool.pop() ?? ({} as RunnerEntity);
  entity.id = runtime.nextEntityId++;
  entity.type = type;
  entity.kind = kind;
  entity.x = x;
  entity.y = y;
  entity.width = width;
  entity.height = height;
  entity.alreadyHit = undefined;
  entity.rewarded = undefined;
  entity.fleeing = undefined;
  entity.opacity = 1;
  entity.velocityX = undefined;
  entity.motion = undefined;
  entity.velocityY = undefined;
  entity.horizontalSpeedFactor = undefined;
  entity.rotation = undefined;
  entity.angularVelocity = undefined;
  entity.originY = undefined;
  entity.amplitude = undefined;
  entity.phase = undefined;
  entity.motionSpeed = undefined;
  return entity;
}

function releaseEntity(runtime: Runtime, entity: RunnerEntity) {
  if (runtime.entityPool.length < 18) runtime.entityPool.push(entity);
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

  const malusBlocked =
    definition.category === "malus" &&
    getPowerUpStrength(runtime, "luperto") > 0;
  const goalTriggered = malusBlocked
    ? false
    : changeTeamRating(
        runtime,
        definition.ratingDelta,
        time,
        definition.category,
        definition.label
      );
  if (!malusBlocked) {
    runtime.score = Math.max(
      0,
      runtime.score + definition.arcadePoints * Math.max(1, runtime.multiplier)
    );
  }

  if (definition.category === "bonus") {
    runtime.bonusesCollected += 1;
    runtime.multiplier = Math.min(5, runtime.multiplier + 0.25);
    if (!goalTriggered) runtime.effect = "bonus";
  } else {
    runtime.malusesCollected += 1;
    if (!malusBlocked) runtime.multiplier = 1;
    if (!goalTriggered) runtime.effect = malusBlocked ? "bonus" : "malus";
  }

  if (malusBlocked) {
    runtime.message = "MALUS ANNULLATO";
    runtime.messageTone = "bonus";
    runtime.messageStartedAt = time;
    runtime.messageUntil = time + 760;
    runtime.effectUntil = time + 520;
    return;
  }

  const signedValue = definition.ratingDelta > 0
    ? `+${formatRating(definition.ratingDelta)}`
    : formatRating(definition.ratingDelta);
  runtime.message = signedValue;
  runtime.messageTone = definition.category;
  runtime.messageStartedAt = time;
  runtime.messageUntil = time + 920;
  if (!goalTriggered) runtime.effectUntil = time + 460;
}

function changeTeamRating(
  runtime: Runtime,
  delta: number,
  time: number,
  reason: RatingChangeReason,
  detail: string
) {
  const previousRating = runtime.teamRating;
  const previousGoals = runtime.confirmedGoals;
  runtime.teamRating = roundRating(runtime.teamRating + delta);
  logRatingChange(previousRating, runtime.teamRating, reason, detail);
  const goals = calculateGoals(runtime.teamRating);
  runtime.confirmedGoals = goals;

  if (goals > previousGoals) {
    runtime.goalCelebrationGoals = goals;
    runtime.goalCelebrationUntil = time + 1050;
    if (goals > runtime.maxGoalsReached) {
      const rewardedGoals = goals - runtime.maxGoalsReached;
      runtime.maxGoalsReached = goals;
      runtime.score += GOAL_THRESHOLD_SCORE_BONUS * rewardedGoals;
      runtime.multiplier = Math.min(
        5,
        runtime.multiplier + GOAL_THRESHOLD_COMBO_BONUS * rewardedGoals
      );
    }
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

function launchObstacle(runtime: Runtime, entity: RunnerEntity, time: number) {
  if (entity.alreadyHit || entity.motion === "launched") return;
  entity.alreadyHit = true;
  entity.rewarded = true;
  entity.motion = "launched";
  entity.velocityX = entity.kind === "slidingTackle" ? 360 : 500;
  entity.velocityY = entity.kind === "slidingTackle" ? -150 : -245;
  entity.angularVelocity = entity.kind === "slidingTackle" ? 3.2 : 5.4;
  runtime.effect = "bonus";
  runtime.effectUntil = time + 420;
  runtime.message = "BARRIERA RESPINTA";
  runtime.messageTone = "bonus";
  runtime.messageStartedAt = time;
  runtime.messageUntil = time + 720;
  runtime.score += 75;
}

function findBlockingObstacle(runtime: Runtime, bonus: RunnerEntity) {
  const bonusCenterY = bonus.y + bonus.height / 2;
  return runtime.entities.find((entity) => {
    if (entity.type !== "physical" || entity.motion === "launched") return false;
    const betweenPlayerAndBonus =
      entity.x > runtime.playerX + PLAYER_SIZE * 0.55 &&
      entity.x < bonus.x + bonus.width;
    const blocksPath =
      bonusCenterY > entity.y - 12 &&
      runtime.playerY + PLAYER_SIZE / 2 > entity.y - 12;
    return betweenPlayerAndBonus && blocksPath;
  });
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
  const scenario = getStageScenario(runtime);
  return {
    score,
    best: Math.max(best, score),
    multiplier: runtime.multiplier,
    teamRating: runtime.teamRating,
    threshold: TEAM_RATING_THRESHOLD,
    goals: runtime.confirmedGoals,
    nextGoalThreshold: getGoalThreshold(runtime.confirmedGoals + 1),
    protectionActive:
      runtime.protectionAvailable && runtime.elapsed < INITIAL_PROTECTION_SECONDS,
    protectionRemaining:
      runtime.protectionAvailable && runtime.elapsed < INITIAL_PROTECTION_SECONDS
        ? Math.max(0, INITIAL_PROTECTION_SECONDS - runtime.elapsed)
        : 0,
    flowProgress: Math.round(runtime.flowProgress),
    speedLevel: getSpeedLevel(getScoreSpeedProgress(runtime)),
    distance: Math.round(runtime.distance),
    scenarioName: scenario.name,
    bonusesCollected: runtime.bonusesCollected,
    malusesCollected: runtime.malusesCollected,
    message: time < runtime.messageUntil ? runtime.message : "",
    gameOverReason: runtime.gameOverReason,
    rafficaType: runtime.burst?.type ?? null,
    rafficaRemaining: runtime.burst?.durationRemaining ?? 0,
    activePowerUps: (Object.keys(runtime.activePowerUps) as PowerUpKind[])
      .map((kind) => {
        const active = runtime.activePowerUps[kind];
        return active && active.expiresAt > runtime.elapsed
          ? {
              kind,
              remaining: Math.max(0, active.expiresAt - runtime.elapsed),
              charges: active.charges,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    presentation:
      runtime.presentation && time < runtime.presentation.until
        ? {
            asset: runtime.presentation.asset,
            title: runtime.presentation.title,
            subtitle: runtime.presentation.subtitle,
            tone: runtime.presentation.tone,
          }
        : null,
    bossRemaining:
      runtime.boss?.phase === "active" ? Math.max(0, runtime.boss.timer) : 0,
  };
}

function getDifficultyProgress(runtime: Runtime) {
  const duration = clamp01(runtime.elapsed / DIFFICULTY_CONFIG.rampSeconds);
  const distance = clamp01(runtime.distance / DIFFICULTY_CONFIG.targetDistance);
  const score = clamp01(runtime.score / DIFFICULTY_CONFIG.targetScore);
  const rating = clamp01(
    (runtime.teamRating - TEAM_RATING_INITIAL) / DIFFICULTY_CONFIG.ratingRange
  );
  const weighted =
    duration * DIFFICULTY_CONFIG.weights.duration +
    distance * DIFFICULTY_CONFIG.weights.distance +
    score * DIFFICULTY_CONFIG.weights.score +
    rating * DIFFICULTY_CONFIG.weights.rating;
  const curved =
    weighted +
    Math.pow(clamp01(weighted), DIFFICULTY_CONFIG.curvePower) *
      DIFFICULTY_CONFIG.nonlinearBoost;
  return Math.max(getDifficultyBand(runtime.teamRating).floor, clamp01(curved));
}

function getScoreSpeedProgress(runtime: Runtime) {
  return clamp01(runtime.peakScore / SPEED_CONFIG.scoreForMaximum);
}

function getRunSpeed(scoreProgress: number) {
  const curved = Math.pow(clamp01(scoreProgress), DIFFICULTY_CONFIG.speedCurvePower);
  return SPEED_CONFIG.initial +
    (SPEED_CONFIG.maximum - SPEED_CONFIG.initial) * curved;
}

function getDifficultyBand(rating: number) {
  return DIFFICULTY_BANDS.find(
    (band) =>
      rating >= band.minimumRating &&
      (band.maximumRating === null || rating <= band.maximumRating)
  ) ?? DIFFICULTY_BANDS[DIFFICULTY_BANDS.length - 1];
}

function getSpeedLevel(difficulty: number) {
  return Math.min(12, 1 + Math.floor(clamp01(difficulty) * 11));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getPhysicalDimensions(kind: PhysicalObstacleKind) {
  const sprite = OBSTACLE_SPRITES[kind];
  return { width: sprite.width, height: sprite.height };
}

function getEventDimensions(kind: EventKind) {
  const sprite = EVENT_SPRITES[kind];
  return sprite
    ? { width: sprite.width, height: sprite.height }
    : { width: kind === "hatTrick" ? 60 : 52, height: kind === "hatTrick" ? 60 : 52 };
}

function getObstacleHitbox(entity: RunnerEntity) {
  const kind = entity.kind as PhysicalObstacleKind;
  const sprite = OBSTACLE_SPRITES[kind];
  const hitbox = sprite.hitbox;
  const scaleX = entity.width / sprite.width;
  const scaleY = entity.height / sprite.height;
  return {
    x: entity.x + hitbox.x * scaleX,
    y: entity.y + hitbox.y * scaleY,
    width: hitbox.width * scaleX,
    height: hitbox.height * scaleY,
  };
}

function getEventHitbox(entity: RunnerEntity) {
  const sprite = EVENT_SPRITES[entity.kind as EventKind];
  if (!sprite) {
    return {
      x: entity.x + 5,
      y: entity.y + 5,
      width: entity.width - 10,
      height: entity.height - 10,
    };
  }
  const scaleX = entity.width / sprite.width;
  const scaleY = entity.height / sprite.height;
  return {
    x: entity.x + sprite.hitbox.x * scaleX,
    y: entity.y + sprite.hitbox.y * scaleY,
    width: sprite.hitbox.width * scaleX,
    height: sprite.hitbox.height * scaleY,
  };
}

function getPowerUpHitbox(entity: RunnerEntity) {
  const definition = POWER_UP_CONFIG[entity.kind as PowerUpKind];
  const hitbox = definition.hitbox;
  const scaleX = entity.width / definition.width;
  const scaleY = entity.height / definition.height;
  return {
    x: entity.x + hitbox.x * scaleX,
    y: entity.y + hitbox.y * scaleY,
    width: hitbox.width * scaleX,
    height: hitbox.height * scaleY,
  };
}

function getPlayerHitbox(runtime: Runtime, time: number) {
  let hitbox: { x: number; y: number; width: number; height: number };
  if (isCrouching(runtime, time)) {
    hitbox = {
      x: runtime.playerX + 3,
      y: runtime.playerY + 14,
      width: PLAYER_SIZE - 6,
      height: PLAYER_SIZE - 14,
    };
  } else if (!runtime.grounded) {
    hitbox = {
      x: runtime.playerX + 10,
      y: runtime.playerY + 7,
      width: PLAYER_SIZE - 20,
      height: PLAYER_SIZE - 12,
    };
  } else {
    hitbox = {
      x: runtime.playerX + 8,
      y: runtime.playerY + 5,
      width: PLAYER_SIZE - 16,
      height: PLAYER_SIZE - 7,
    };
  }
  const expansion = 34 * getPowerUpStrength(runtime, "lukaku") +
    ((runtime.mobileLayout ? MOBILE_PLAYER_SCALE : 1) - 1) * PLAYER_SIZE * 0.34;
  return runtime.mobileLayout
    ? expandRectUpward(hitbox, expansion)
    : expandRect(hitbox, expansion);
}

function expandRectUpward(
  rect: { x: number; y: number; width: number; height: number },
  amount: number
) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount,
  };
}

function expandRect(
  rect: { x: number; y: number; width: number; height: number },
  amount: number
) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
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
  assets: GameImageMap,
  time: number,
  reducedMotion: boolean
) {
  const viewport = getLogicalCanvasViewport(context);
  context.clearRect(0, 0, viewport.width, viewport.height);
  const scenario = getStageScenario(runtime);
  const reducedEffects = reducedMotion || runtime.reducedPerformance;

  const hasAssetBackground = drawAssetBackground(context, runtime, assets);
  if (!hasAssetBackground) {
    drawScenario(context, scenario, runtime, 1, reducedMotion);
    drawGround(context, scenario, runtime.pits, 1);
  }
  drawSpeedComfortOverlay(context, runtime);
  drawRafficaOverlay(context, runtime);

  context.save();
  if (runtime.mobileLayout) context.translate(0, MOBILE_WORLD_OFFSET_Y);
  if (hasAssetBackground) drawAssetHazards(context, runtime, assets);
  drawBoss(context, runtime, assets);
  for (const entity of runtime.entities) {
    context.save();
    context.globalAlpha *= entity.opacity ?? 1;
    drawEntity(context, entity, assets, runtime.elapsed, reducedEffects);
    context.restore();
  }
  if (runtime.playerVisible) {
    drawPlayer(context, runtime, logo, time, scenario, reducedEffects);
  }
  drawGoalCelebration(context, runtime, time, scenario);
  drawEventFeedback(context, runtime, time);
  context.restore();
}

function getStageScenario(runtime: Runtime) {
  return GAME_SCENARIOS[getVisibleBackgroundStage(runtime) - 1] ?? GAME_SCENARIOS[0];
}

function drawAssetBackground(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  assets: GameImageMap
) {
  const viewport = getLogicalCanvasViewport(context);
  const transition = runtime.backgroundTransition;
  const currentStage = transition?.from ?? runtime.backgroundStage;
  const currentConfig = BACKGROUND_STAGE_CONFIG[currentStage];
  if (!assets.get(currentConfig.stadium) || !assets.get(currentConfig.ground)) {
    return false;
  }

  if (!transition) {
    drawStageLayers(context, currentStage, runtime, assets, 1, viewport);
    return true;
  }

  const targetConfig = BACKGROUND_STAGE_CONFIG[transition.to];
  if (!assets.get(targetConfig.stadium) || !assets.get(targetConfig.ground)) {
    drawStageLayers(context, currentStage, runtime, assets, 1, viewport);
    return true;
  }

  const progress = smoothProgress(transition.progress);
  drawStageLayers(context, currentStage, runtime, assets, 1, viewport);
  drawStageLayers(context, transition.to, runtime, assets, progress, viewport);
  return true;
}

function drawStageLayers(
  context: CanvasRenderingContext2D,
  stage: GameBackgroundStage,
  runtime: Runtime,
  assets: GameImageMap,
  alpha: number,
  viewport: { width: number; height: number }
) {
  const config = BACKGROUND_STAGE_CONFIG[stage];
  const stadium = assets.get(config.stadium);
  const ground = assets.get(config.ground);
  if (!stadium || !ground) return;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = config.backdrop;
  context.fillRect(0, 0, viewport.width, viewport.height);
  drawBackgroundTiles(context, stadium, runtime.stadiumOffset, viewport);
  context.save();
  context.globalAlpha = alpha * (1 - runtime.visualComfort * 0.1);
  drawGroundTiles(context, ground, runtime.groundOffset, viewport, stage);
  context.restore();
  context.restore();
}

function drawBackgroundTiles(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  offset: number,
  viewport: { width: number; height: number }
) {
  const scale = Math.max(
    viewport.width / image.naturalWidth,
    viewport.height / image.naturalHeight
  );
  const tileWidth = image.naturalWidth * scale;
  const tileHeight = image.naturalHeight * scale;
  const y = (viewport.height - tileHeight) / 2;
  const step = Math.max(1, tileWidth - BACKGROUND_TRANSITION_CONFIG.loopPixelOverlap);
  const firstTileIndex = Math.floor(offset / step);
  const localOffset = offset - firstTileIndex * step;
  let tileX = -localOffset;
  let tileIndex = firstTileIndex;

  while (tileX < viewport.width) {
    const mirrored = Math.abs(tileIndex) % 2 === 1;
    if (mirrored) {
      context.save();
      context.translate(tileX + tileWidth, 0);
      context.scale(-1, 1);
      context.drawImage(image, 0, y, tileWidth, tileHeight);
      context.restore();
    } else {
      context.drawImage(image, tileX, y, tileWidth, tileHeight);
    }
    tileX += step;
    tileIndex += 1;
  }
}

function drawGroundTiles(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  offset: number,
  viewport: { width: number; height: number },
  stage: GameBackgroundStage
) {
  const scale = Math.max(
    viewport.width / image.naturalWidth,
    viewport.height / image.naturalHeight
  );
  const tileWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const tileHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const y = Math.round((viewport.height - tileHeight) / 2);
  const overlap = 2;
  const step = Math.max(1, tileWidth - overlap);
  const localOffset = ((offset % step) + step) % step;
  const firstX = -Math.floor(localOffset);
  let tileIndex = Math.floor(offset / step);
  for (let tileX = firstX; tileX < viewport.width; tileX += step) {
    const mirrorForSeam = stage !== 1 && Math.abs(tileIndex) % 2 === 1;
    context.save();
    if (mirrorForSeam) {
      context.translate(tileX + tileWidth, 0);
      context.scale(-1, 1);
      context.drawImage(image, 1, 0, Math.max(1, image.naturalWidth - 2), image.naturalHeight, 0, y, tileWidth, tileHeight);
    } else {
      context.drawImage(image, 1, 0, Math.max(1, image.naturalWidth - 2), image.naturalHeight, tileX, y, tileWidth, tileHeight);
    }
    context.restore();
    tileIndex += 1;
  }
}

function drawRafficaOverlay(
  context: CanvasRenderingContext2D,
  runtime: Runtime
) {
  if (!runtime.burstOverlayType || runtime.burstOverlayIntensity <= 0) return;
  const viewport = getLogicalCanvasViewport(context);
  const isMalus = runtime.burstOverlayType === "malus";
  const slowPulse = 0.94 + Math.sin(runtime.elapsed * (isMalus ? 2.1 : 1.45)) * 0.06;
  const staticOverlay = getRafficaStaticOverlay(
    runtime.burstOverlayType,
    viewport.width,
    viewport.height
  );
  context.save();
  context.globalAlpha = runtime.burstOverlayIntensity * slowPulse;
  context.drawImage(staticOverlay, 0, 0, viewport.width, viewport.height);

  if (!isMalus && !runtime.reducedPerformance) {
    drawBonusParticles(context, runtime, viewport, runtime.burstOverlayIntensity);
  }
  context.restore();
}

function getRafficaStaticOverlay(
  type: RafficaType,
  width: number,
  height: number
) {
  const key = `${type}-${Math.round(width)}x${Math.round(height)}`;
  const cached = RAFFICA_OVERLAY_CACHE.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const overlay = canvas.getContext("2d");
  if (!overlay) return canvas;
  const isMalus = type === "malus";
  const gradient = overlay.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, isMalus ? "rgba(127,29,29,0.9)" : "rgba(180,112,16,0.82)");
  gradient.addColorStop(0.5, isMalus ? "rgba(190,24,93,0.28)" : "rgba(251,191,36,0.24)");
  gradient.addColorStop(1, isMalus ? "rgba(69,10,10,0.72)" : "rgba(120,53,15,0.68)");
  overlay.fillStyle = gradient;
  overlay.fillRect(0, 0, width, height);
  const vignette = overlay.createRadialGradient(
    width / 2, height / 2, height * 0.16, width / 2, height / 2, width * 0.68
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, isMalus ? "rgba(55,0,8,0.78)" : "rgba(80,44,4,0.42)");
  overlay.fillStyle = vignette;
  overlay.fillRect(0, 0, width, height);
  if (isMalus) {
    for (const x of [0, width]) {
      const glow = overlay.createRadialGradient(x, 0, 0, x, 0, width * 0.34);
      glow.addColorStop(0, "rgba(255,80,80,0.48)");
      glow.addColorStop(1, "rgba(120,0,15,0)");
      overlay.fillStyle = glow;
      overlay.fillRect(0, 0, width, height * 0.58);
    }
  }
  RAFFICA_OVERLAY_CACHE.set(key, canvas);
  return canvas;
}

function drawBonusParticles(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  viewport: { width: number; height: number },
  intensity: number
) {
  context.fillStyle = "#fde68a";
  for (let index = 0; index < 8; index += 1) {
    const x = (index * 83 + runtime.elapsed * (9 + (index % 3) * 3)) % viewport.width;
    const y = 42 + ((index * 71 + runtime.elapsed * 13) % Math.max(80, viewport.height - 110));
    const radius = 0.8 + (index % 3) * 0.45;
    context.globalAlpha = intensity * (0.38 + (index % 4) * 0.1);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSpeedComfortOverlay(
  context: CanvasRenderingContext2D,
  runtime: Runtime
) {
  if (runtime.visualComfort <= 0 || runtime.reducedPerformance) return;
  const viewport = getLogicalCanvasViewport(context);
  context.save();
  context.globalAlpha = runtime.visualComfort * 0.12;
  context.fillStyle = "#0f2743";
  context.fillRect(0, 0, viewport.width, viewport.height);
  context.restore();
}

function getLogicalCanvasViewport(context: CanvasRenderingContext2D) {
  const transform = context.getTransform();
  const canvas = context.canvas;
  return {
    width: canvas.width / Math.max(0.0001, Math.abs(transform.a)),
    height: canvas.height / Math.max(0.0001, Math.abs(transform.d)),
  };
}

function drawAssetHazards(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  assets: GameImageMap
) {
  for (const pit of runtime.pits) {
    const stage = pit.stage ?? getVisibleBackgroundStage(runtime);
    const image = assets.get(BACKGROUND_STAGE_CONFIG[stage].hazard);
    if (!image) {
      drawFallbackPit(context, pit);
      continue;
    }
    const width = pit.width * 2.1;
    const height = width * (image.naturalHeight / image.naturalWidth);
    const x = pit.x - pit.width * 0.59;
    const y = GROUND_Y - pit.width * 0.27;
    context.drawImage(image, x, y, width, height);
  }
}

function drawFallbackPit(context: CanvasRenderingContext2D, pit: GroundPit) {
  context.save();
  const gradient = context.createRadialGradient(
    pit.x + pit.width / 2,
    GROUND_Y + 5,
    4,
    pit.x + pit.width / 2,
    GROUND_Y + 8,
    pit.width * 0.62
  );
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.65, "#160d08");
  gradient.addColorStop(1, "rgba(101,68,45,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(
    pit.x + pit.width / 2,
    GROUND_Y + 10,
    pit.width * 0.62,
    pit.width * 0.34,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();
}

function smoothProgress(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
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
  const lukakuStrength = getPowerUpStrength(runtime, "lukaku");

  context.save();
  context.globalAlpha = airborne ? 0.16 : 0.3;
  context.fillStyle = "#020617";
  context.beginPath();
  context.ellipse(
    runtime.playerX + PLAYER_SIZE / 2,
    runtime.playerY + PLAYER_SIZE + (airborne ? Math.min(38, (PLAYER_GROUND_Y - runtime.playerY) * 0.28) : 2),
    (airborne ? 17 : crouching ? 31 : 25) * (1 + lukakuStrength * 0.42),
    airborne ? 4 : 6,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();

  if (getPowerUpStrength(runtime, "luperto") > 0) {
    drawPersistentShield(context, runtime, time, reducedMotion);
  }

  const effectKind = runtime.powerUpCollectionEffect?.kind;
  if (effectKind && runtime.powerUpCollectionEffect) {
    drawPowerUpCollectionEffect(
      context,
      effectKind,
      runtime.playerX + PLAYER_SIZE / 2,
      runtime.playerY + PLAYER_SIZE / 2,
      1 - Math.max(0, runtime.powerUpCollectionEffect.until - time) / 820,
      reducedMotion
    );
  }

  context.save();
  const runCycle = reducedMotion ? 0 : Math.sin(runtime.elapsed * 10.5);
  const rising = runtime.velocityY < -30;
  const falling = runtime.velocityY > 80;
  const centerX = runtime.playerX + PLAYER_SIZE / 2 + jitter;
  const groundedBottom = runtime.playerY + PLAYER_SIZE;
  const centerY = (crouching
    ? groundedBottom - PLAYER_SIZE * 0.41
    : runtime.playerY + PLAYER_SIZE / 2 + (airborne ? 0 : runCycle * 1.4)) -
      ((runtime.mobileLayout ? MOBILE_PLAYER_SCALE : 1) - 1) * PLAYER_SIZE * 0.5;
  const basePlayerScale = runtime.mobileLayout ? MOBILE_PLAYER_SCALE : 1;
  const lukakuScale = (1 + lukakuStrength * 1.12) * basePlayerScale;
  const playerScale = (hitReaction
      ? 0.92
      : airborne
        ? rising ? 0.98 : 1.02
        : 1 + Math.abs(runCycle) * 0.008) * lukakuScale;
  const scaleX = crouching ? 1.08 * lukakuScale : playerScale;
  const scaleY = crouching ? 0.82 * lukakuScale : playerScale;
  const collectionRotation = effectKind === "gimenez" && runtime.powerUpCollectionEffect
    ? Math.sin(time / 22) * 0.035 * Math.max(0, (runtime.powerUpCollectionEffect.until - time) / 820)
    : effectKind === "lukaku" && runtime.powerUpCollectionEffect
      ? -0.025 * Math.max(0, (runtime.powerUpCollectionEffect.until - time) / 820)
      : 0;
  const rotation = (crouching
    ? -0.035
    : airborne
      ? rising ? -0.075 : falling ? 0.055 : 0
      : runCycle * 0.018) + collectionRotation;

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
    context.shadowBlur = runtime.effect === "jump" ? 5 : 10;
  } else if (airborne) {
    context.shadowColor = `${scenario.accent}66`;
    context.shadowBlur = 4;
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

function drawPersistentShield(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  time: number,
  reducedMotion: boolean
) {
  const strength = getPowerUpStrength(runtime, "luperto");
  const pulse = reducedMotion ? 0 : Math.sin(time / 220) * 2;
  const centerX = runtime.playerX + PLAYER_SIZE / 2;
  const centerY = runtime.playerY + PLAYER_SIZE / 2;
  context.save();
  context.globalAlpha = 0.4 * strength;
  context.strokeStyle = POWER_UP_CONFIG.luperto.hudColor;
  context.lineWidth = 3;
  context.shadowColor = POWER_UP_CONFIG.luperto.hudColor;
  context.shadowBlur = reducedMotion ? 0 : 11;
  context.beginPath();
  context.arc(centerX, centerY, 42 + pulse, Math.PI * 0.12, Math.PI * 0.88);
  context.quadraticCurveTo(centerX, centerY + 62 + pulse, centerX - 42 - pulse, centerY);
  context.stroke();
  context.restore();
}

function drawPowerUpCollectionEffect(
  context: CanvasRenderingContext2D,
  kind: PowerUpKind,
  centerX: number,
  centerY: number,
  rawProgress: number,
  reducedMotion: boolean
) {
  const progress = Math.max(0, Math.min(1, rawProgress));
  const alpha = 1 - progress;
  const color = POWER_UP_CONFIG[kind].hudColor;
  context.save();
  context.globalAlpha = Math.max(0, alpha * 0.9);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = kind === "luperto" ? 4 : 2.5;
  context.shadowColor = color;
  context.shadowBlur = reducedMotion ? 0 : 12;

  if (kind === "luperto") {
    context.beginPath();
    context.arc(centerX, centerY, 38 + progress * 25, Math.PI * 0.12, Math.PI * 0.88);
    context.quadraticCurveTo(centerX, centerY + 64 + progress * 12, centerX - (38 + progress * 25), centerY);
    context.stroke();
  } else if (kind === "lukaku") {
    for (let index = 0; index < 2; index += 1) {
      context.globalAlpha = alpha * (0.72 - index * 0.2);
      context.beginPath();
      context.arc(centerX, centerY, 34 + progress * (48 + index * 22), 0, Math.PI * 2);
      context.stroke();
    }
  } else if (kind === "nico-paz") {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(centerX + side * 26, centerY, 24 + progress * 18, -Math.PI / 2, Math.PI / 2, side < 0);
      context.stroke();
    }
  } else if (kind === "dybala") {
    context.setLineDash([5, 7]);
    context.beginPath();
    context.ellipse(centerX, centerY, 38 + progress * 34, 27 + progress * 18, progress * 0.6, 0, Math.PI * 2);
    context.stroke();
  } else {
    for (let index = 0; index < 4; index += 1) {
      const offset = (index - 1.5) * 13;
      context.globalAlpha = alpha * (0.28 + index * 0.1);
      context.fillRect(centerX - 42 + progress * 22, centerY + offset, 84 - progress * 30, 2);
    }
  }
  context.restore();
}

function drawEntity(
  context: CanvasRenderingContext2D,
  entity: RunnerEntity,
  assets: GameImageMap,
  elapsed: number,
  reducedEffects: boolean
) {
  if (entity.type === "powerup") {
    drawPowerUp(context, entity, assets, elapsed, reducedEffects);
    return;
  }
  if (entity.type === "physical") {
    drawPhysicalObstacle(context, entity, assets, elapsed, reducedEffects);
    return;
  }

  const definition = EVENT_DEFINITIONS[entity.kind as EventKind];
  const isBonus = definition.category === "bonus";
  if ((entity.horizontalSpeedFactor ?? 1) > 1.08) {
    context.save();
    context.globalAlpha = 0.2;
    context.strokeStyle = isBonus ? "#7dd3fc" : "#fda4af";
    context.lineWidth = 1.5;
    context.lineCap = "round";
    const centerY = entity.y + entity.height / 2;
    for (let index = 0; index < 2; index += 1) {
      context.beginPath();
      context.moveTo(entity.x + entity.width + 5, centerY - 5 + index * 10);
      context.lineTo(
        entity.x + entity.width + 20 + index * 8,
        centerY - 8 + index * 10
      );
      context.stroke();
    }
    context.restore();
  }
  drawEventIdentity(context, entity, isBonus, elapsed);
  if (!isBonus && entity.motion && entity.motion !== "ground") {
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
  const sprite = EVENT_SPRITES[entity.kind as EventKind];
  const spriteImage = sprite ? assets.get(sprite.asset) : undefined;
  if (sprite && spriteImage) {
    context.save();
    context.shadowColor = isBonus
      ? `${definition.color}99`
      : "rgba(2,6,23,0.4)";
    context.shadowBlur = reducedEffects ? 0 : isBonus ? 7 : 3;
    context.shadowOffsetY = 2;
    drawCroppedSprite(context, spriteImage, sprite.source, entity);
    context.restore();
    return;
  }
  context.save();
  context.shadowColor = isBonus ? `${definition.color}88` : "rgba(0,0,0,0.35)";
  context.shadowBlur = reducedEffects ? 0 : isBonus ? 8 : 3;
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

function drawPowerUp(
  context: CanvasRenderingContext2D,
  entity: RunnerEntity,
  assets: GameImageMap,
  elapsed: number,
  reducedEffects: boolean
) {
  const definition = POWER_UP_CONFIG[entity.kind as PowerUpKind];
  const image = assets.get(definition.assetKey);
  const pulse = 1 + Math.sin(elapsed * 3.2 + entity.id) * 0.035;
  context.save();
  context.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
  context.scale(pulse, pulse);
  context.shadowColor = definition.hudColor;
  context.shadowBlur = reducedEffects ? 0 : 9;
  if (image) {
    context.drawImage(image, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
  } else {
    context.fillStyle = definition.hudColor;
    context.beginPath();
    context.arc(0, 0, entity.width * 0.38, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawBoss(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  assets: GameImageMap
) {
  if (!runtime.boss || runtime.boss.phase === "warning") return;
  const image = assets.get("event.boss");
  if (!image) return;
  const bossRect = getBossRect(runtime);
  const { x, y, width, height } = bossRect;
  const shotProgress = Math.max(0, 1 - (runtime.elapsed - runtime.boss.lastShotAt) / 0.32);
  const exitProgress = runtime.boss.phase === "exiting"
    ? 1 - clamp01(runtime.boss.timer / 0.7)
    : 0;
  context.save();
  context.globalAlpha = 0.94 * (1 - exitProgress);
  context.shadowColor = "rgba(244,63,94,0.42)";
  context.shadowBlur = runtime.reducedPerformance ? 0 : 18;
  context.translate(x + width / 2, y + height / 2);
  context.rotate(-shotProgress * 0.018 + Math.sin(runtime.elapsed * 0.55) * 0.008);
  const charging = Math.max(0, 1 - runtime.boss.spawnTimer / 0.22);
  if (runtime.boss.spawnTimer > 0 && runtime.boss.spawnTimer < 0.22) {
    context.save();
    context.globalAlpha = charging * 0.38;
    context.fillStyle = "#fda4af";
    context.beginPath();
    context.arc(-width * 0.2, height * 0.04, 10 + charging * 12, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}

function getBossRect(runtime: Runtime) {
  const bossScale = runtime.mobileLayout ? 0.68 : runtime.mobileVisualScale;
  const width = 250 * bossScale;
  const height = 375 * bossScale;
  const shotProgress = runtime.boss
    ? Math.max(0, 1 - (runtime.elapsed - runtime.boss.lastShotAt) / 0.32)
    : 0;
  const exitProgress = runtime.boss?.phase === "exiting"
    ? 1 - clamp01(runtime.boss.timer / 0.7)
    : 0;
  return {
    width,
    height,
    x: runtime.worldWidth - width - 12 +
      Math.sin(runtime.elapsed * 0.62) * 9 +
      shotProgress * 15 +
      exitProgress * 95,
    y: GROUND_Y - height - 2 + Math.sin(runtime.elapsed * 0.82) * 11,
  };
}

function drawPhysicalObstacle(
  context: CanvasRenderingContext2D,
  entity: RunnerEntity,
  assets: GameImageMap,
  elapsed: number,
  reducedEffects: boolean
) {
  const sprite = OBSTACLE_SPRITES[entity.kind as PhysicalObstacleKind];
  const image = assets.get(sprite.asset);
  if (!image) {
    drawLegacyPhysicalObstacle(context, entity);
    return;
  }
  context.save();
  if (entity.kind === "slidingTackle" && entity.motion !== "launched" && !reducedEffects) {
    context.fillStyle = "rgba(148,163,184,0.22)";
    for (let index = 0; index < 3; index += 1) {
      const wave = Math.sin(elapsed * 6.4 + entity.id * 0.7 + index * 1.8);
      context.globalAlpha = 0.2 + index * 0.035;
      context.beginPath();
      context.ellipse(
        entity.x + entity.width + 7 + index * 11,
        GROUND_Y - 5 - Math.abs(wave) * (4 + index),
        5 + index * 1.5,
        2.3 + index * 0.6,
        -0.16,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }
  context.globalAlpha = 0.38;
  context.fillStyle = "#020617";
  context.beginPath();
  context.ellipse(
    entity.x + entity.width / 2,
    GROUND_Y + 1,
    Math.max(16, entity.width * 0.43),
    Math.max(4, entity.height * 0.075),
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.globalAlpha = 1;
  context.shadowColor = "rgba(2,6,23,0.62)";
  context.shadowBlur = reducedEffects ? 0 : 7;
  context.shadowOffsetY = 4;
  if (entity.motion === "launched") {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y + entity.height / 2;
    context.translate(centerX, centerY);
    context.rotate(entity.rotation ?? 0);
    context.translate(-centerX, -centerY);
  }
  drawCroppedSprite(context, image, sprite.source, entity);
  context.restore();
}

function drawEventIdentity(
  context: CanvasRenderingContext2D,
  entity: RunnerEntity,
  isBonus: boolean,
  elapsed: number
) {
  const centerX = entity.x + entity.width / 2;
  const centerY = entity.y + entity.height / 2;
  const pulse = 0.5 + Math.sin(elapsed * (isBonus ? 3.1 : 5.4) + entity.id) * 0.5;
  const aura = context.createRadialGradient(
    centerX,
    centerY,
    2,
    centerX,
    centerY,
    Math.max(entity.width, entity.height) * 0.78
  );
  aura.addColorStop(0, isBonus ? "rgba(52,211,153,0.28)" : "rgba(248,113,113,0.28)");
  aura.addColorStop(0.62, isBonus ? "rgba(56,189,248,0.1)" : "rgba(245,158,11,0.09)");
  aura.addColorStop(1, "rgba(0,0,0,0)");

  context.save();
  context.fillStyle = aura;
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    Math.max(entity.width, entity.height) * (0.66 + pulse * 0.08),
    0,
    Math.PI * 2
  );
  context.fill();

  context.globalAlpha = 0.5 + pulse * 0.28;
  context.fillStyle = isBonus ? "#a7f3d0" : "#fecaca";
  if (isBonus) {
    for (let index = 0; index < 3; index += 1) {
      const angle = elapsed * 0.8 + entity.id + index * 2.1;
      const radius = Math.max(entity.width, entity.height) * (0.55 + index * 0.08);
      context.beginPath();
      context.arc(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius * 0.58,
        1.3 + index * 0.35,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  } else {
    context.strokeStyle = "rgba(251,113,133,0.58)";
    context.lineWidth = 1.5;
    for (let index = 0; index < 2; index += 1) {
      const y = centerY - 8 + index * 14 + Math.sin(elapsed * 9 + entity.id) * 2;
      context.beginPath();
      context.moveTo(entity.x - 7 - index * 3, y);
      context.lineTo(entity.x + 2, y - 3);
      context.stroke();
    }
  }

  context.globalAlpha = 0.94;
  context.fillStyle = isBonus ? "#d1fae5" : "#ffe4e6";
  context.shadowColor = isBonus ? "rgba(16,185,129,0.9)" : "rgba(244,63,94,0.9)";
  context.shadowBlur = 7;
  context.font = "900 15px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(isBonus ? "+" : "−", entity.x + entity.width + 5, entity.y + 3);
  context.restore();
}

function drawCroppedSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: { x: number; y: number; width: number; height: number },
  entity: Pick<RunnerEntity, "x" | "y" | "width" | "height" | "rotation">
) {
  const scale = Math.min(entity.width / source.width, entity.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  const x = entity.x + (entity.width - width) / 2;
  const y = entity.y + entity.height - height;
  const rotation = entity.rotation ?? 0;
  if (Math.abs(rotation) > 0.001) {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y + entity.height / 2;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      x - centerX,
      y - centerY,
      width,
      height
    );
    context.restore();
    return;
  }
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    x,
    y,
    width,
    height
  );
}

function drawLegacyPhysicalObstacle(context: CanvasRenderingContext2D, entity: RunnerEntity) {
  const kind = String(entity.kind);
  context.save();
  context.shadowColor = "rgba(2,6,23,0.55)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 7;

  if (kind === "barrier") {
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
  } else if (kind === "sign") {
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
  } else if (kind === "overhead") {
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
  } else if (kind === "platform") {
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
  roundedRect(context, runtime.worldWidth / 2 - 105, 88, 210, 76, 15);
  context.fill();
  context.textAlign = "center";
  context.fillStyle = "#fde68a";
  context.font = "900 30px sans-serif";
  context.fillText("GOL!", runtime.worldWidth / 2, 120);
  context.fillStyle = "#ffffff";
  context.font = "900 17px sans-serif";
  context.fillText(
    `${runtime.goalCelebrationGoals}–0`,
    runtime.worldWidth / 2,
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
  const duration = Math.max(1, runtime.messageUntil - runtime.messageStartedAt);
  const progress = clamp01((time - runtime.messageStartedAt) / duration);
  const fade = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  const isTextMessage = runtime.message === "MALUS ANNULLATO" || runtime.message === "BARRIERA RESPINTA";
  const x = Math.min(runtime.worldWidth - 74, runtime.playerX + PLAYER_SIZE + 42);
  const y = Math.max(42, runtime.playerY + 18 - progress * 28);

  context.save();
  context.globalAlpha = Math.max(0, fade);
  context.fillStyle = positive ? "#a7f3d0" : negative ? "#fecdd3" : "#e2e8f0";
  context.shadowColor = positive ? "rgba(52,211,153,.65)" : "rgba(251,113,133,.62)";
  context.shadowBlur = runtime.reducedPerformance ? 0 : 8;
  context.font = isTextMessage
    ? runtime.mobileLayout ? "900 13px sans-serif" : "900 11px sans-serif"
    : runtime.mobileLayout ? "900 31px sans-serif" : "900 27px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const shake = negative && !runtime.reducedPerformance
    ? Math.sin(progress * Math.PI * 8) * (1 - progress) * 2
    : 0;
  context.fillText(runtime.message, x + shake, y);
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
