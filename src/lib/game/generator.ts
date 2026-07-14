import { BONUS_POOL, MALUS_POOL, SPAWN_CONFIG } from "./config";
import type { EventDefinition, PhysicalObstacleKind } from "./types";

type ObstacleSequence = [
  PhysicalObstacleKind,
  PhysicalObstacleKind,
  ...PhysicalObstacleKind[],
];

const FALLING_MALUS_POOL = MALUS_POOL.map((event) => ({
  ...event,
  weight: event.kind === "redCard" ? 2 : event.weight,
}));

export type SpawnDecision =
  | {
      type: "event";
      event: EventDefinition;
      elevated: boolean;
      falling?: boolean;
      xOffset?: number;
      fallSpeed?: number;
    }
  | { type: "physical"; kind: PhysicalObstacleKind }
  | { type: "sequence"; kinds: ObstacleSequence }
  | { type: "pit"; width: number };

export function createSpawnDecision({
  elapsed,
  random = Math.random,
}: {
  elapsed: number;
  random?: () => number;
}): SpawnDecision {
  if (elapsed < 5) {
    const protectedRoll = random();
    if (protectedRoll < 0.3) {
      return {
        type: "event",
        event: weightedPick(BONUS_POOL, random),
        elevated: random() > 0.52,
      };
    }
    if (protectedRoll < 0.55) {
      return {
        type: "event",
        event: weightedPick(MALUS_POOL, random),
        elevated: false,
      };
    }
    return { type: "physical", kind: pickPhysicalKind(random, false) };
  }

  const difficulty = getDifficultyProgress(elapsed);
  const pitChance = interpolate(
    SPAWN_CONFIG.pitBaseChance,
    SPAWN_CONFIG.pitMaximumChance,
    difficulty
  );
  const physicalChance = interpolate(
    SPAWN_CONFIG.physicalBaseChance,
    SPAWN_CONFIG.physicalMaximumChance,
    difficulty
  );
  const malusChance = interpolate(
    SPAWN_CONFIG.malusBaseChance,
    SPAWN_CONFIG.malusMaximumChance,
    difficulty
  );
  const roll = random();

  if (roll < pitChance) {
    return {
      type: "pit",
      width: 96 + Math.round(random() * (24 + difficulty * 18)),
    };
  }

  if (roll < pitChance + physicalChance) {
    const sequenceChance = interpolate(
      SPAWN_CONFIG.sequenceBaseChance,
      SPAWN_CONFIG.sequenceMaximumChance,
      difficulty
    );
    if (elapsed > 24 && random() < sequenceChance) {
      return { type: "sequence", kinds: createObstacleSequence(difficulty, random) };
    }
    return {
      type: "physical",
      kind: pickPhysicalKind(random, elapsed > 14),
    };
  }

  if (roll < pitChance + physicalChance + malusChance) {
    const fallingChance = interpolate(0.18, 0.36, difficulty);
    const falling = elapsed > 12 && random() < fallingChance;
    const event = falling
      ? weightedPick(FALLING_MALUS_POOL, random)
      : weightedPick(MALUS_POOL, random);
    return {
      type: "event",
      event,
      elevated: !falling && random() > 0.82 && difficulty > 0.28,
      falling,
      xOffset: falling ? -690 + random() * 540 : 0,
      fallSpeed: falling ? 145 + difficulty * 170 + random() * 45 : 0,
    };
  }

  return {
    type: "event",
    event: weightedPick(BONUS_POOL, random),
    elevated: random() > 0.44,
  };
}

export function getSafeSpawnInterval(
  speed: number,
  elapsed: number,
  random = Math.random
) {
  const base = Math.max(
    SPAWN_CONFIG.minimumInterval,
    SPAWN_CONFIG.initialInterval - elapsed * SPAWN_CONFIG.intervalReductionPerSecond
  );
  const safeDistance =
    SPAWN_CONFIG.minimumClearDistance + speed * SPAWN_CONFIG.speedDistanceFactor;
  const safeInterval = safeDistance / speed;
  const rhythmRoll = random();

  let rhythmMultiplier: number;
  if (rhythmRoll < 0.14) {
    rhythmMultiplier = 1.5 + random() * 0.55;
  } else if (rhythmRoll < 0.4) {
    rhythmMultiplier = 0.74 + random() * 0.2;
  } else if (rhythmRoll < 0.8) {
    rhythmMultiplier = 0.94 + random() * 0.24;
  } else {
    rhythmMultiplier = 1.18 + random() * 0.3;
  }

  const jitter = (random() - 0.5) * SPAWN_CONFIG.randomInterval;
  return Math.max(safeInterval, base * rhythmMultiplier + jitter);
}

function createObstacleSequence(
  difficulty: number,
  random: () => number
): ObstacleSequence {
  const lowKinds: PhysicalObstacleKind[] = ["barrier", "block", "platform"];
  const firstLow = lowKinds[Math.floor(random() * lowKinds.length)];
  const secondLow = lowKinds[Math.floor(random() * lowKinds.length)];
  const triple = difficulty > 0.48 && random() < 0.12 + difficulty * 0.24;

  if (triple) {
    return random() > 0.5
      ? [firstLow, "overhead", secondLow]
      : ["overhead", firstLow, "overhead"];
  }

  return random() > 0.5
    ? [firstLow, "overhead"]
    : ["overhead", firstLow];
}

function pickPhysicalKind(
  random: () => number,
  includeOverhead: boolean
): PhysicalObstacleKind {
  const kinds: PhysicalObstacleKind[] = includeOverhead
    ? ["barrier", "sign", "block", "overhead", "platform"]
    : ["barrier", "sign", "block", "platform"];
  return kinds[Math.floor(random() * kinds.length)];
}

function getDifficultyProgress(elapsed: number) {
  const linear = Math.min(
    1,
    Math.max(0, (elapsed - 12) / SPAWN_CONFIG.difficultyRampSeconds)
  );
  return linear * linear * (3 - 2 * linear);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function weightedPick<T extends { weight: number }>(
  items: T[],
  random: () => number
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }

  return items[items.length - 1];
}
