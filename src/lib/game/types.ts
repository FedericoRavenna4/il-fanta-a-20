export type GameStatus =
  | "selecting"
  | "ready"
  | "running"
  | "paused"
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
  | "barrier"
  | "sign"
  | "block"
  | "overhead"
  | "platform";

export type RunnerEntity = {
  id: number;
  type: "event" | "physical";
  kind: EventKind | PhysicalObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  alreadyHit?: boolean;
  rewarded?: boolean;
  motion?: "ground" | "falling";
  velocityY?: number;
  targetY?: number;
};

export type GroundPit = {
  id: number;
  x: number;
  width: number;
  rewarded?: boolean;
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
  decor: "terraces" | "towers" | "stadium" | "cup" | "europa" | "champions";
};
