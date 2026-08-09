export type FantaBetType =
  | "1X2"
  | "UNDER_OVER_2_5"
  | "RISULTATO_ESATTO"
  | "FANTAPUNTEGGIO_1X2";

export type FantaBetChoice = "1" | "X" | "2" | "UNDER" | "OVER" | "ESATTO";

export type FantaBetMatchResult = {
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeFantasyPoints: number | null;
  awayFantasyPoints: number | null;
};

export type FantaBetPrediction = {
  choice: FantaBetChoice;
  exactHome?: number | null;
  exactAway?: number | null;
};

export type FantaBetPlay = {
  id: string | number;
  matchId: string | number;
  type: FantaBetType;
  pointsValue: number;
  displayOrder: number;
  prediction: FantaBetPrediction;
  result: FantaBetMatchResult;
};

export type FantaBetRoundScore = {
  evaluable: boolean;
  basePoints: number | null;
  finalPoints: number | null;
  correctPredictions: number | null;
  perfect: boolean;
};

