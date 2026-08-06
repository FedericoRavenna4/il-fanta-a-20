export type LeagueId = "serie-a" | "serie-b" | "serie-c-a" | "serie-c-b" | "serie-c-c";

export type Team = { id: number; name: string; logo: string; slug: string };

export type Match = {
  id: string;
  matchday: number;
  serieAMatchday: number | null;
  home: Team;
  away: Team;
  homeGoals: number | null;
  awayGoals: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

export type StandingRow = Team & {
  position: number; played: number; won: number; drawn: number; lost: number;
  points: number; goalsFor: number; goalsAgainst: number; goalDifference: number;
  fantasyPoints: number; movement: number;
};

export type ScoreHighlight = { team: Team; score: number; matchday: number };
export type LeagueStats = { best: ScoreHighlight | null; worst: ScoreHighlight | null };

export type LeagueData = {
  id: LeagueId;
  competitionCode: string;
  name: string;
  shortName: string;
  found: boolean;
  initialMatchday: number;
  availableMatchdays: number[];
  teams: Team[];
  matches: Match[];
};

export type Season = { id: number; code: string; name: string };
export type LiveChampionshipData = { season: Season; seasons: Season[]; leagues: LeagueData[] };

export type GlobalStats = {
  best: ScoreHighlight | null;
  worst: ScoreHighlight | null;
  highestScoringMatch: Match | null;
};

export type LeagueRules = {
  promoted: boolean;
  relegated: boolean;
  scattoPromozione: boolean;
};
