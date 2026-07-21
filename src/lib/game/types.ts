export type GameStatus =
  | "selecting"
  | "ready"
  | "starting"
  | "running"
  | "paused"
  | "varCheck"
  | "gameOver";

export type GameTeam = {
  id: number;
  slug: string;
  nome: string;
  logo: string;
  lega: string;
  accent: "sky" | "lime" | "violet";
};

export type EventCategory = "bonus" | "malus";
export type RafficaType = "malus" | "bonus";
export type PowerUpKind = "luperto" | "lukaku" | "dybala" | "nico-paz" | "gimenez";

export type EventKind =
  | "yellowCard"
  | "redCard"
  | "missedPenalty"
  | "concededGoal"
  | "ownGoal"
  | "goal"
  | "assist"
  | "cleanSheet"
  | "savedPenalty"
  | "hatTrick";

export type PhysicalObstacleKind =
  | "cornerFlag"
  | "stretcher"
  | "slidingTackle"
  | "var";

export type RunnerEntity = {
  id: number;
  type: "event" | "physical" | "powerup";
  kind: EventKind | PhysicalObstacleKind | PowerUpKind;
  x: number;
  y: number;
  width: number;
  height: number;
  alreadyHit?: boolean;
  rewarded?: boolean;
  fleeing?: boolean;
  opacity?: number;
  velocityX?: number;
  motion?: "ground" | "floating" | "sine" | "diagonal" | "serpentine" | "rush" | "launched" | "bossProjectile";
  velocityY?: number;
  horizontalSpeedFactor?: number;
  rotation?: number;
  angularVelocity?: number;
  originY?: number;
  amplitude?: number;
  phase?: number;
  motionSpeed?: number;
  magnetCaptured?: boolean;
};

export type ActivePowerUpSnapshot = {
  kind: PowerUpKind;
  remaining: number;
  charges: number;
};

export type SpecialPresentation = {
  asset: string;
  title: string;
  subtitle: string;
  tone: "bonus" | "malus" | "neutral";
};

export type GameSnapshot = {
  score: number;
  best: number;
  multiplier: number;
  teamRating: number;
  threshold: number;
  goals: number;
  nextGoalThreshold: number;
  protectionActive: boolean;
  protectionRemaining: number;
  flowProgress: number;
  speedLevel: number;
  distance: number;
  scenarioName: string;
  bonusesCollected: number;
  malusesCollected: number;
  message: string;
  gameOverReason: string;
  rafficaType: RafficaType | null;
  rafficaRemaining: number;
  activePowerUps: ActivePowerUpSnapshot[];
  presentation: SpecialPresentation | null;
  bossRemaining: number;
};

export type EventDefinition = {
  kind: EventKind;
  category: EventCategory;
  label: string;
  shortLabel: string;
  symbol: string;
  ratingDelta: number;
  arcadePoints: number;
  weight: number;
  color: string;
  border: string;
};

export type GameScenario = {
  id: string;
  name: string;
  subtitle: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  accent: string;
  secondary: string;
  grassLight: string;
  grassDark: string;
  stand: string;
  crowd: string;
  wear: number;
  lightIntensity: number;
  decor: "terraces" | "towers" | "stadium" | "cup" | "europa" | "champions";
};
