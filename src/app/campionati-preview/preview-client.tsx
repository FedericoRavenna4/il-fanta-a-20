"use client";

import ChampionshipView from "../campionati-live-preview/live-client";
import type { LiveChampionshipData } from "../campionati-live-preview/types";
import type { LeagueMock } from "./types";

/** Mock and live deliberately converge here on the same normalized UI model. */
export default function ChampionshipPreview({ leagues, initialLeague, initialTab }: { leagues: LeagueMock[]; initialLeague?: string; initialTab?: "results" | "table" }) {
  const normalized: LiveChampionshipData = {
    season: { id: 0, code: "mock", name: "Stagione mock" },
    seasons: [],
    leagues: leagues.map((league) => ({
      id: league.id,
      competitionCode: league.id,
      name: league.name,
      shortName: league.shortName,
      found: true,
      initialMatchday: league.currentMatchday,
      availableMatchdays: Object.keys(league.matchdays).map(Number).sort((a, b) => a - b),
      teams: league.teams,
      matches: Object.entries(league.matchdays).flatMap(([day, matches]) => matches.map((match) => ({
        ...match,
        matchday: Number(day),
        serieAMatchday: Number(day),
        status: match.homeGoals === null ? "programmata" : "calcolata",
      }))),
    })),
  };
  return <ChampionshipView data={normalized} mock initialLeague={initialLeague} initialTab={initialTab} />;
}
