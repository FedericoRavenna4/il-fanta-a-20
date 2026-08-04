export type LeagueId =
  | "serie-a"
  | "serie-b"
  | "serie-c-a"
  | "serie-c-b"
  | "serie-c-c";

export type MockTeam = { id: number; name: string; logo: string; slug: string };

export type MockMatch = {
  id: string;
  home: MockTeam;
  away: MockTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type StandingRow = MockTeam & {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  fantasyPoints: number;
  movement: number;
};

export type LeagueMock = {
  id: LeagueId;
  name: string;
  shortName: string;
  currentMatchday: number;
  teams: MockTeam[];
  matchdays: Record<number, MockMatch[]>;
};

export type ScoreHighlight = {
  team: MockTeam;
  score: number;
  matchday: number;
};
