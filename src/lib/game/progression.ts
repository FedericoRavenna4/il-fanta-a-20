import type { GameBackgroundStage } from "./assets";

export type GameLevel = 1 | 2 | 3;
export type LevelOutcome = "promoted" | "relegated" | "safe" | "stayed";

export type ClubProgress = {
  currentLevel: GameLevel;
  bestDistanceByLevel: Record<GameLevel, number>;
  level3Saves: number;
  lastOutcome?: LevelOutcome;
  lastPlayedAt?: number;
};

export type LevelResolution = {
  playedLevel: GameLevel;
  outcome: LevelOutcome;
  newLevel: GameLevel;
  threshold: number;
  badgeEarned: boolean;
  title: string;
  message: string;
};

export const ARCADE_PROGRESS_STORAGE_KEY = "fanta-a-20-arcade-progress-v1";
export const ARCADE_PROGRESS_STORAGE_VERSION = 2;
export const DISPLAY_DISTANCE_MULTIPLIER = 2;

export function toDisplayDistance(internalDistance: number) {
  return Math.max(0, Math.round(internalDistance * DISPLAY_DISTANCE_MULTIPLIER));
}

export const LEVEL_RULES: Record<GameLevel, {
  name: string;
  background: GameBackgroundStage;
  promotionAt: number | null;
  relegationBelow: number | null;
  objective: string;
  difficulty: {
    difficultyBoost: number;
    speedProgressMultiplier: number;
    mixedWeightBonus: number;
    spawnIntervalMultiplier: number;
    advancedPressureBoost: number;
    bossProjectileMultiplier: number;
    bossRecoveryBonus: number;
  };
}> = {
  1: {
    name: "Campo di strada",
    background: 1,
    promotionAt: 4000,
    relegationBelow: null,
    objective: "Raggiungi 4.000 m per essere promosso.",
    difficulty: {
      difficultyBoost: 0,
      speedProgressMultiplier: 0.94,
      mixedWeightBonus: 0,
      spawnIntervalMultiplier: 1.06,
      advancedPressureBoost: 0,
      bossProjectileMultiplier: 0.92,
      bossRecoveryBonus: 0.14,
    },
  },
  2: {
    name: "Campo di provincia",
    background: 2,
    promotionAt: 4000,
    relegationBelow: 2000,
    objective: "2.000 m per restare, 4.000 m per la promozione.",
    difficulty: {
      difficultyBoost: 0.07,
      speedProgressMultiplier: 1.04,
      mixedWeightBonus: 16,
      spawnIntervalMultiplier: 0.96,
      advancedPressureBoost: 0.1,
      bossProjectileMultiplier: 1,
      bossRecoveryBonus: 0,
    },
  },
  3: {
    name: "Stadio gremito",
    background: 3,
    promotionAt: null,
    relegationBelow: 3000,
    objective: "Raggiungi 3.000 m per ottenere la salvezza.",
    difficulty: {
      difficultyBoost: 0.14,
      speedProgressMultiplier: 1.14,
      mixedWeightBonus: 30,
      spawnIntervalMultiplier: 0.9,
      advancedPressureBoost: 0.2,
      bossProjectileMultiplier: 1.07,
      bossRecoveryBonus: -0.08,
    },
  },
};

export function createDefaultClubProgress(): ClubProgress {
  return {
    currentLevel: 1,
    bestDistanceByLevel: { 1: 0, 2: 0, 3: 0 },
    level3Saves: 0,
  };
}

export function resolveLevelOutcome(
  currentLevel: GameLevel,
  distance: number
): LevelResolution {
  const measuredDistance = Math.max(0, Math.round(distance));
  if (currentLevel === 1) {
    const promoted = measuredDistance >= LEVEL_RULES[1].promotionAt!;
    return {
      playedLevel: 1,
      outcome: promoted ? "promoted" : "stayed",
      newLevel: promoted ? 2 : 1,
      threshold: LEVEL_RULES[1].promotionAt!,
      badgeEarned: false,
      title: promoted ? "Promozione!" : "Categoria mantenuta",
      message: promoted
        ? "Promozione al Campo di provincia"
        : "Resta nel Campo di strada",
    };
  }
  if (currentLevel === 2) {
    if (measuredDistance < LEVEL_RULES[2].relegationBelow!) {
      return {
        playedLevel: 2,
        outcome: "relegated",
        newLevel: 1,
        threshold: LEVEL_RULES[2].relegationBelow!,
        badgeEarned: false,
        title: "Retrocessione",
        message: "Ritorno al Campo di strada",
      };
    }
    const promoted = measuredDistance >= LEVEL_RULES[2].promotionAt!;
    return {
      playedLevel: 2,
      outcome: promoted ? "promoted" : "stayed",
      newLevel: promoted ? 3 : 2,
      threshold: promoted
        ? LEVEL_RULES[2].promotionAt!
        : LEVEL_RULES[2].relegationBelow!,
      badgeEarned: false,
      title: promoted ? "Promozione!" : "Categoria mantenuta",
      message: promoted
        ? "Promozione allo Stadio gremito"
        : "Permanenza nel Campo di provincia",
    };
  }
  const safe = measuredDistance >= LEVEL_RULES[3].relegationBelow!;
  return {
    playedLevel: 3,
    outcome: safe ? "safe" : "relegated",
    newLevel: safe ? 3 : 2,
    threshold: LEVEL_RULES[3].relegationBelow!,
    badgeEarned: safe,
    title: safe ? "Salvezza raggiunta" : "Retrocessione",
    message: safe
      ? "Permanenza nello Stadio gremito"
      : "Ritorno al Campo di provincia",
  };
}

export function applyLevelResult(
  progress: ClubProgress,
  playedLevel: GameLevel,
  distance: number,
  playedAt = Date.now()
) {
  const resolution = resolveLevelOutcome(playedLevel, distance);
  const nextProgress: ClubProgress = {
    currentLevel: resolution.newLevel,
    bestDistanceByLevel: {
      ...progress.bestDistanceByLevel,
      [playedLevel]: Math.max(
        progress.bestDistanceByLevel[playedLevel] ?? 0,
        Math.max(0, Math.round(distance))
      ),
    },
    level3Saves: progress.level3Saves + (resolution.badgeEarned ? 1 : 0),
    lastOutcome: resolution.outcome,
    lastPlayedAt: playedAt,
  };
  return { progress: nextProgress, resolution };
}

export function readArcadeProgress(): Record<string, ClubProgress> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARCADE_PROGRESS_STORAGE_KEY) ?? "{}");
    const storedVersion = isRecord(parsed) && Number(parsed.version) >= 2 ? 2 : 1;
    const clubs = isRecord(parsed) && isRecord(parsed.clubs) ? parsed.clubs : parsed;
    if (!isRecord(clubs)) return {};
    return Object.fromEntries(
      Object.entries(clubs).map(([clubId, value]) => [
        clubId,
        sanitizeClubProgress(value, storedVersion === 1 ? DISPLAY_DISTANCE_MULTIPLIER : 1),
      ])
    );
  } catch {
    return {};
  }
}

export function writeClubProgress(clubId: number, progress: ClubProgress) {
  if (typeof window === "undefined") return;
  try {
    const clubs = readArcadeProgress();
    clubs[String(clubId)] = sanitizeClubProgress(progress);
    window.localStorage.setItem(
      ARCADE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: ARCADE_PROGRESS_STORAGE_VERSION, clubs })
    );
  } catch {
    // La corsa resta utilizzabile anche se lo storage locale non è disponibile.
  }
}

function sanitizeClubProgress(value: unknown, distanceMultiplier = 1): ClubProgress {
  if (!isRecord(value)) return createDefaultClubProgress();
  const level = value.currentLevel === 2 || value.currentLevel === 3 ? value.currentLevel : 1;
  const distances = isRecord(value.bestDistanceByLevel) ? value.bestDistanceByLevel : {};
  const lastOutcome = ["promoted", "relegated", "safe", "stayed"].includes(String(value.lastOutcome))
    ? value.lastOutcome as LevelOutcome
    : undefined;
  return {
    currentLevel: level,
    bestDistanceByLevel: {
      1: safeNumber(distances[1] ?? distances["1"]) * distanceMultiplier,
      2: safeNumber(distances[2] ?? distances["2"]) * distanceMultiplier,
      3: safeNumber(distances[3] ?? distances["3"]) * distanceMultiplier,
    },
    level3Saves: safeNumber(value.level3Saves),
    lastOutcome,
    lastPlayedAt: safeNumber(value.lastPlayedAt) || undefined,
  };
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
