import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { loadAllPages } from "./pagination";
import type { LineupAdminRound, PublicLineup, TeamOption } from "./types";

function db() { return getSupabaseAdminClient() as unknown as SupabaseClient; }
function publicName(team: { nome_personalizzato: string | null; nome_ufficiale: string }) { return team.nome_personalizzato?.trim() || team.nome_ufficiale; }

export async function getLineupAdminRounds(): Promise<LineupAdminRound[]> {
  const admin = db();
  const roundsResult = await admin.from("fantabet_rounds").select("id,stagione_id,numero_giornata,status,deadline_at").order("deadline_at", { ascending: false });
  if (roundsResult.error) throw new Error("LINEUP_ROUNDS_LOAD_FAILED");
  const rounds = roundsResult.data ?? []; const roundIds = rounds.map((row) => Number(row.id));
  const betsResult = roundIds.length ? await admin.from("fantabet_bets").select("round_id,partita_id,display_order").in("round_id", roundIds).order("display_order") : { data: [], error: null };
  if (betsResult.error) throw new Error("LINEUP_BETS_LOAD_FAILED");
  const matchIds = [...new Set((betsResult.data ?? []).map((row) => Number(row.partita_id)))];
  const matchesResult = matchIds.length ? await admin.from("partite").select("id,societa_casa_id,societa_trasferta_id").in("id", matchIds) : { data: [], error: null };
  if (matchesResult.error) throw new Error("LINEUP_MATCHES_LOAD_FAILED");
  const societyIds = [...new Set((matchesResult.data ?? []).flatMap((row) => [Number(row.societa_casa_id), Number(row.societa_trasferta_id)]))];
  const teamsResult = societyIds.length ? await admin.from("societa").select("id,nome_ufficiale,nome_personalizzato").in("id", societyIds) : { data: [], error: null };
  if (teamsResult.error) throw new Error("LINEUP_TEAMS_LOAD_FAILED");
  const names = new Map((teamsResult.data ?? []).map((row) => [Number(row.id), publicName(row as { nome_personalizzato: string | null; nome_ufficiale: string })]));
  const matches = new Map((matchesResult.data ?? []).map((row) => [Number(row.id), { id: Number(row.id), home: { id: Number(row.societa_casa_id), name: names.get(Number(row.societa_casa_id)) ?? "Società" }, away: { id: Number(row.societa_trasferta_id), name: names.get(Number(row.societa_trasferta_id)) ?? "Società" } }]));
  return rounds.map((round) => ({ id: Number(round.id), seasonId: Number(round.stagione_id), matchday: Number(round.numero_giornata), status: String(round.status), matches: (betsResult.data ?? []).filter((bet) => Number(bet.round_id) === Number(round.id)).sort((a, b) => Number(a.display_order) - Number(b.display_order)).flatMap((bet) => { const match = matches.get(Number(bet.partita_id)); return match ? [match] : []; }) })).filter((round) => round.matches.length === 5);
}

export async function getLineupMatchContext(matchId: number) {
  if (!Number.isSafeInteger(matchId) || matchId <= 0) throw new Error("LINEUP_MATCH_INVALID");
  const rounds = await getLineupAdminRounds(); const round = rounds.find((item) => item.matches.some((match) => match.id === matchId)); const match = round?.matches.find((item) => item.id === matchId);
  if (!round || !match) throw new Error("LINEUP_MATCH_NOT_IN_FANTABET");
  const admin = db();
  const societyIds = [match.home.id, match.away.id];
  const [teamsResult, matchRostersResult, allTeamsResult] = await Promise.all([
    admin.from("societa").select("id,nome_ufficiale,nome_personalizzato,nome_normalizzato,slug").in("id", societyIds),
    admin.from("rose_giocatori").select("id,lega_codice,societa_id,giocatore,squadra_reale,ruolo").eq("stagione_id", round.seasonId).in("societa_id", societyIds).order("giocatore"),
    admin.from("societa").select("id,nome_ufficiale,nome_personalizzato"),
  ]);
  if (teamsResult.error || matchRostersResult.error || allTeamsResult.error) throw new Error("LINEUP_CONTEXT_LOAD_FAILED");
  type RosterRow = { id: number; lega_codice: string; societa_id: number; giocatore: string; squadra_reale: string | null; ruolo: string };
  const matchRosters = (matchRostersResult.data ?? []) as RosterRow[];
  const leagueCodes = [...new Set(matchRosters.map((player) => player.lega_codice))];
  const leaguePlayers = await loadAllPages<RosterRow>(async (from, to) => {
    const result = await admin.from("rose_giocatori").select("id,lega_codice,societa_id,giocatore,squadra_reale,ruolo").eq("stagione_id", round.seasonId).in("lega_codice", leagueCodes).order("giocatore").order("id").range(from, to);
    if (result.error) throw new Error("LINEUP_CONTEXT_LOAD_FAILED");
    return (result.data ?? []) as RosterRow[];
  });
  const byId = new Map(((teamsResult.data ?? []) as Array<{ id: number; nome_ufficiale: string; nome_personalizzato: string | null; nome_normalizzato: string; slug: string }>).map((team) => [Number(team.id), team]));
  const teamNames = new Map((allTeamsResult.data ?? []).map((row) => [Number(row.id), publicName(row as { nome_personalizzato: string | null; nome_ufficiale: string })]));
  const option = (societyId: number): TeamOption => { const team = byId.get(societyId); if (!team) throw new Error("LINEUP_CONTEXT_LOAD_FAILED"); const leagues = [...new Set(matchRosters.filter((player) => player.societa_id === societyId).map((player) => player.lega_codice))]; if (leagues.length !== 1) throw new Error("LINEUP_LEAGUE_INVALID"); const leagueCode=leagues[0]; const mapPlayer=(player: RosterRow) => ({ id: player.id, name: player.giocatore, role: player.ruolo, societyId: player.societa_id, societyName: teamNames.get(player.societa_id) ?? "Società", realTeam: player.squadra_reale }); return { id: societyId, name: publicName(team), aliases: [team.nome_ufficiale, team.nome_personalizzato ?? "", team.nome_normalizzato, team.slug].filter(Boolean), leagueCode, roster: matchRosters.filter((player) => player.societa_id === societyId).map(mapPlayer), leaguePlayers: leaguePlayers.filter((player) => player.lega_codice === leagueCode).map(mapPlayer) }; };
  return { roundId: round.id, matchId, seasonId: round.seasonId, matchday: round.matchday, teams: [option(match.home.id), option(match.away.id)] as [TeamOption, TeamOption] };
}

export async function getPublicLineups(seasonId: number, matchday: number, societyIds: number[]) {
  if (!societyIds.length) return new Map<number, PublicLineup>();
  const { data } = await db().rpc("public_fantabet_lineups", { p_stagione_id: seasonId, p_numero_giornata: matchday, p_societa_ids: societyIds });
  const rows = (data ?? []) as Array<{ societa_id: number; societa_nome: string; modulo: string | null; players: PublicLineup["players"] }>;
  return new Map(rows.map((row) => [Number(row.societa_id), { societyId: Number(row.societa_id), societyName: row.societa_nome, formation: row.modulo, players: row.players ?? [] }]));
}
