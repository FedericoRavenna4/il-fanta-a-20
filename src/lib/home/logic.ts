import type { LeagueData, Match } from "@/app/campionati-live-preview/types";
import type { FantaBetRoundOption } from "@/lib/fantabet/server";

export function isCalculatedHomeMatch(match: Match) {
  return match.status === "calcolata" && match.homeGoals !== null && match.awayGoals !== null;
}

export function selectHomeMatchState(leagues: LeagueData[], teamId: number | null) {
  const personalLeague = teamId ? leagues.find((league) => league.teams.some((team) => team.id === teamId)) ?? null : null;
  const league = personalLeague ?? leagues[0] ?? null;
  const team = teamId && personalLeague ? personalLeague.teams.find((item) => item.id === teamId) ?? null : null;
  const ordered = [...(league?.matches ?? [])].sort((a, b) => a.matchday - b.matchday || String(a.id).localeCompare(String(b.id)));
  const relevant = team ? ordered.filter((match) => match.home.id === team.id || match.away.id === team.id) : ordered;
  return { league, team, last: [...relevant].filter(isCalculatedHomeMatch).at(-1) ?? null, next: relevant.find((match) => !isCalculatedHomeMatch(match)) ?? null };
}

export function fantaBetHomeState(round: FantaBetRoundOption | null, submitted: boolean, viewerId: string | null, now: string) {
  if (!round) return { state: "missing" as const, label: "Preparati al prossimo turno", cta: "Vai al FantaBet", href: "/fantabet" };
  const timestamp = new Date(now).getTime();
  const open = round.status === "pubblicata" && timestamp >= new Date(round.opensAt).getTime() && timestamp < new Date(round.deadlineAt).getTime();
  if (submitted) return { state: "submitted" as const, label: "Schedina giocata", cta: "Vedi la schedina", href: `/fantabet?round=${round.id}` };
  if (open) return { state: "open" as const, label: "La schedina è aperta", cta: "Gioca la schedina", href: viewerId ? `/fantabet?round=${round.id}` : `/account/accedi?returnTo=${encodeURIComponent(`/fantabet?round=${round.id}`)}` };
  return { state: "closed" as const, label: "Prossima schedina", cta: "Vai al FantaBet", href: "/fantabet" };
}
