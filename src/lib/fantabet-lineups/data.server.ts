import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { PublicLineup, TeamOption } from "./types";

function db() { return getSupabaseAdminClient() as unknown as SupabaseClient; }
export async function getLineupAdminOptions(seasonId?: number) {
  const admin = db(); const seasonsResult = await admin.from("stagioni").select("id,codice,nome,attiva").order("anno_inizio", { ascending: false });
  const seasons = (seasonsResult.data ?? []) as Array<{ id: number; codice: string; nome: string; attiva: boolean }>;
  const chosen = seasonId ?? seasons.find((season) => season.attiva)?.id ?? seasons[0]?.id ?? null;
  if (!chosen) return { seasons, selectedSeasonId: null, teams: [] as TeamOption[] };
  const [teamsResult, rostersResult] = await Promise.all([admin.from("societa").select("id,nome,nome_normalizzato,slug").eq("attiva", true).order("nome"), admin.from("rose_giocatori").select("id,societa_id,giocatore,ruolo").eq("stagione_id", chosen).order("giocatore")]);
  const rosters = (rostersResult.data ?? []) as Array<{ id: number; societa_id: number; giocatore: string; ruolo: string }>;
  const teams = ((teamsResult.data ?? []) as Array<{ id: number; nome: string; nome_normalizzato: string; slug: string }>).filter((team) => rosters.some((player) => player.societa_id === team.id)).map((team) => ({ id: team.id, name: team.nome, aliases: [team.nome_normalizzato, team.slug], roster: rosters.filter((player) => player.societa_id === team.id).map((player) => ({ id: player.id, name: player.giocatore, role: player.ruolo })) }));
  return { seasons, selectedSeasonId: chosen, teams };
}
export async function getPublicLineups(seasonId: number, matchday: number, societyIds: number[]) {
  if (!societyIds.length) return new Map<number, PublicLineup>();
  const { data } = await db().rpc("public_fantabet_lineups", { p_stagione_id: seasonId, p_numero_giornata: matchday, p_societa_ids: societyIds });
  const rows = (data ?? []) as Array<{ societa_id: number; societa_nome: string; modulo: string | null; players: Array<{ order: number; name: string; role: string }> }>;
  return new Map(rows.map((row) => [Number(row.societa_id), { societyId: Number(row.societa_id), societyName: row.societa_nome, formation: row.modulo, players: row.players ?? [] }]));
}
