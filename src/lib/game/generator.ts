import { BONUS_POOL, DIFFICULTY_CONFIG, MALUS_POOL, SPAWN_CONFIG } from "./config";
import type { EventDefinition, PhysicalObstacleKind, RunnerEntity } from "./types";

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
      heightLevel: 0 | 1 | 2;
      falling?: boolean;
      motion?: RunnerEntity["motion"];
      xOffset?: number;
      fallSpeed?: number;
      amplitude?: number;
      motionSpeed?: number;
      trail?: number;
      trailRise?: number;
    }
  | { type: "physical"; kind: PhysicalObstacleKind; bonus?: EventDefinition }
  | { type: "sequence"; kinds: ObstacleSequence }
  | { type: "pit"; width: number; bonus?: EventDefinition };

export function createSpawnDecision({
  elapsed,
  difficulty: suppliedDifficulty,
  random = Math.random,
}: {
  elapsed: number;
  difficulty?: number;
  random?: () => number;
}): SpawnDecision {
  if (elapsed < 5) {
    const protectedRoll = random();
    if (protectedRoll < 0.3) {
      return {
        type: "event",
        event: weightedPick(BONUS_POOL, random),
        heightLevel: random() > 0.52 ? 1 : 0,
      };
    }
    if (protectedRoll < 0.55) {
      return {
        type: "event",
        event: weightedPick(MALUS_POOL, random),
        heightLevel: 0,
      };
    }
    return { type: "physical", kind: pickPhysicalKind(random, false) };
  }

  const difficulty = suppliedDifficulty ?? getFallbackDifficulty(elapsed);
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
      bonus:
        random() < DIFFICULTY_CONFIG.tacticalBonusChance
          ? weightedPick(BONUS_POOL, random)
          : undefined,
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
      bonus:
        random() < DIFFICULTY_CONFIG.tacticalBonusChance * 0.72
          ? weightedPick(BONUS_POOL, random)
          : undefined,
    };
  }

  if (roll < pitChance + physicalChance + malusChance) {
    const fallingChance = interpolate(0.18, 0.36, difficulty);
    const falling = elapsed > 12 && random() < fallingChance;
    const movingChance = interpolate(
      DIFFICULTY_CONFIG.movingMalusBaseChance,
      DIFFICULTY_CONFIG.movingMalusMaximumChance,
      difficulty
    );
    const moving = !falling && elapsed > 16 && random() < movingChance;
    const movingRoll = random();
    const motion: RunnerEntity["motion"] = falling
      ? "falling"
      : movingRoll < 0.42
        ? "floating"
        : movingRoll < 0.78
          ? "sine"
          : "diagonal";
    const event = falling
      ? weightedPick(FALLING_MALUS_POOL, random)
      : weightedPick(MALUS_POOL, random);
    return {
      type: "event",
      event,
      heightLevel: !falling && random() > 0.78 && difficulty > 0.22 ? 1 : 0,
      falling,
      motion: moving ? motion : falling ? "falling" : "ground",
      xOffset: falling ? -690 + random() * 540 : 0,
      fallSpeed: falling ? 145 + difficulty * 170 + random() * 45 : 0,
      amplitude: moving ? 18 + random() * (20 + difficulty * 18) : 0,
      motionSpeed: moving ? 1.25 + random() * 1.35 + difficulty * 0.8 : 0,
    };
  }

  const heightRoll = random();
  const heightLevel: 0 | 1 | 2 = heightRoll < 0.3
    ? 0
    : heightRoll < 0.76
      ? 1
      : 2;
  const trailChance = interpolate(
    DIFFICULTY_CONFIG.bonusTrailBaseChance,
    DIFFICULTY_CONFIG.bonusTrailMaximumChance,
    difficulty
  );
  return {
    type: "event",
    event: weightedPick(BONUS_POOL, random),
    heightLevel,
    motion: random() < 0.32 ? "floating" : "ground",
    amplitude: 10 + random() * 15,
    motionSpeed: 1 + random() * 1.2,
    trail: random() < trailChance ? (random() < difficulty * 0.35 ? 3 : 2) : 1,
    trailRise: random() > 0.5 ? 28 : -28,
  };
}

export function getSafeSpawnInterval(
  speed: number,
  difficulty: number,
  random = Math.random
) {
  const base = interpolate(
    SPAWN_CONFIG.initialInterval,
    SPAWN_CONFIG.minimumInterval,
    Math.max(0, Math.min(1, difficulty))
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

function getFallbackDifficulty(elapsed: number) {
  const linear = Math.min(
    1,
    Math.max(0, (elapsed - 12) / DIFFICULTY_CONFIG.rampSeconds)
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
