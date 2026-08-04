export type PickSelection = "home" | "away" | "split";

export type Game = {
  id: string;
  week: number;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  homeSec: boolean;
  awaySec: boolean;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeam: string | null;
  completed: boolean;
  status: string;
};

export type Standing = {
  id: number;
  displayName: string;
  correct: number;
  wrong: number;
  possible: number;
  rank: number;
};

export type PredictedRecord = {
  wins: number;
  losses: number;
  ties: number;
};
