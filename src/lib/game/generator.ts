import { BONUS_POOL, DIFFICULTY_CONFIG, MALUS_POOL, SPAWN_CONFIG } from "./config";
import type { EventDefinition, PhysicalObstacleKind, RunnerEntity } from "./types";

type ObstacleSequence = [
  PhysicalObstacleKind,
  PhysicalObstacleKind,
  ...PhysicalObstacleKind[],
];

const INITIAL_BONUS_POOL = BONUS_POOL.filter(
  (event) => event.kind === "assist" || event.kind === "cleanSheet"
);
const OBSTACLE_PATTERNS: ObstacleSequence[] = [
  ["cornerFlag", "stretcher"],
  ["var", "slidingTackle"],
  ["stretcher", "cornerFlag"],
  ["slidingTackle", "var"],
  ["cornerFlag", "var", "stretcher"],
  ["stretcher", "slidingTackle", "cornerFlag"],
];

export type SpawnDecision =
  | {
      type: "event";
      event: EventDefinition;
      heightLevel: 0 | 1 | 2;
      motion?: RunnerEntity["motion"];
      xOffset?: number;
      amplitude?: number;
      motionSpeed?: number;
      horizontalSpeedFactor?: number;
      angularVelocity?: number;
      trail?: number;
      trailRise?: number;
    }
  | { type: "physical"; kind: PhysicalObstacleKind; bonus?: EventDefinition }
  | { type: "sequence"; kinds: ObstacleSequence }
  | { type: "pit"; width: number; bonus?: EventDefinition }
  | { type: "breather" };

export function createSpawnDecision({
  elapsed,
  distance = 0,
  difficulty: suppliedDifficulty,
  random = Math.random,
}: {
  elapsed: number;
  distance?: number;
  teamRating?: number;
  difficulty?: number;
  random?: () => number;
}): SpawnDecision {
  if (elapsed < 5) {
    const protectedRoll = random();
    if (protectedRoll < 0.38) {
      return {
        type: "event",
        event: weightedPick(INITIAL_BONUS_POOL, random),
        heightLevel: random() > 0.52 ? 1 : 0,
      };
    }
    if (protectedRoll < 0.6) {
      return {
        type: "event",
        event: weightedPick(MALUS_POOL, random),
        heightLevel: 0,
      };
    }
    if (protectedRoll < 0.64) {
      return { type: "physical", kind: pickPhysicalKind(random) };
    }
    return { type: "breather" };
  }

  const difficulty = suppliedDifficulty ?? getFallbackDifficulty(elapsed);
  const openingProgress = Math.max(
    0,
    Math.min(1, distance / SPAWN_CONFIG.openingBonus.distanceEndMeters)
  );
  const pitChance = SPAWN_CONFIG.hazardsEnabled
    ? interpolate(
        SPAWN_CONFIG.pitBaseChance,
        SPAWN_CONFIG.pitMaximumChance,
        difficulty
      )
    : 0;
  const physicalChance = interpolate(
    SPAWN_CONFIG.physicalBaseChance,
    SPAWN_CONFIG.physicalMaximumChance,
    difficulty
  ) * interpolate(SPAWN_CONFIG.openingBonus.physicalChanceMultiplier, 1, openingProgress);
  const malusChance = interpolate(
    SPAWN_CONFIG.malusBaseChance,
    SPAWN_CONFIG.malusMaximumChance,
    difficulty
  ) * interpolate(SPAWN_CONFIG.openingBonus.malusChanceMultiplier, 1, openingProgress);
  const opening = SPAWN_CONFIG.openingBonus;
  const openingExtraChance = elapsed <= opening.strongUntilSeconds
    ? opening.strongExtraChance
    : elapsed < opening.moderateUntilSeconds
      ? opening.moderateExtraChance *
        (opening.moderateUntilSeconds - elapsed) /
        (opening.moderateUntilSeconds - opening.strongUntilSeconds)
      : 0;
  const bonusChance = interpolate(
    SPAWN_CONFIG.bonusBaseChance,
    SPAWN_CONFIG.bonusMaximumChance,
    difficulty
  ) + openingExtraChance;
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
    if (
      elapsed > 24 &&
      distance > SPAWN_CONFIG.openingBonus.distanceEndMeters &&
      random() < sequenceChance
    ) {
      return { type: "sequence", kinds: createObstacleSequence(difficulty, random) };
    }
    return {
      type: "physical",
      kind: pickPhysicalKind(random),
      bonus:
        random() < DIFFICULTY_CONFIG.tacticalBonusChance * 0.72
          ? weightedPick(BONUS_POOL, random)
          : undefined,
    };
  }

  if (roll < pitChance + physicalChance + malusChance) {
    const movingChance = interpolate(
      DIFFICULTY_CONFIG.movingMalusBaseChance,
      DIFFICULTY_CONFIG.movingMalusMaximumChance,
      difficulty
    );
    const moving = elapsed > 16 && random() < movingChance;
    const movingRoll = random();
    const motion: RunnerEntity["motion"] = movingRoll < 0.42
      ? "serpentine"
      : movingRoll < 0.78
        ? "sine"
        : "diagonal";
    const event = weightedPick(MALUS_POOL, random);
    return {
      type: "event",
      event,
      heightLevel: random() > 0.78 && difficulty > 0.22 ? 1 : 0,
      motion: moving ? motion : "ground",
      xOffset: 0,
      amplitude: moving ? 12 + random() * (12 + difficulty * 10) : 0,
      motionSpeed: moving ? 1.05 + random() * 0.75 + difficulty * 0.45 : 0,
      horizontalSpeedFactor: 1,
      angularVelocity: 0,
    };
  }

  if (roll >= pitChance + physicalChance + malusChance + bonusChance) {
    return { type: "breather" };
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
    event:
      elapsed <= opening.moderateUntilSeconds &&
      random() < opening.preferredAssistCleanSheetChance
        ? weightedPick(INITIAL_BONUS_POOL, random)
        : weightedPick(BONUS_POOL, random),
    heightLevel,
    motion: random() < 0.18 ? (random() < 0.62 ? "floating" : "sine") : "ground",
    amplitude: 8 + random() * 8,
    motionSpeed: 0.9 + random() * 0.6,
    horizontalSpeedFactor: 1,
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
  const candidates = difficulty > 0.48
    ? OBSTACLE_PATTERNS
    : OBSTACLE_PATTERNS.filter((pattern) => pattern.length === 2);
  return candidates[Math.floor(random() * candidates.length)];
}

function pickPhysicalKind(random: () => number): PhysicalObstacleKind {
  const kinds: PhysicalObstacleKind[] = [
    "cornerFlag",
    "stretcher",
    "slidingTackle",
    "var",
  ];
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
