import "server-only";

import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import type { CurrentSocieta } from "@/lib/societa/current.server";
import type { CoppaMatch, CoppaTeam } from "./coppa-fanta-fixture";

type RawSeason = { id: number };
type RawEdition = { id: number };
type RawMatch = { id: number; giornata_lega: number; societa_casa_id: number; societa_trasferta_id: number; fantapunti_casa: number | null; fantapunti_trasferta: number | null; gol_casa: number | null; gol_trasferta: number | null; stato: string };

export type CoppaData = { teams: CoppaTeam[]; matches: CoppaMatch[]; initialDay: number; hasCalendar: boolean };

export async function loadActiveCoppaData(catalogOverride?: CurrentSocieta[]): Promise<CoppaData> {
  const supabase = await createAuthenticatedSupabaseClient();
  const catalog = catalogOverride ?? await getActiveSocietaCatalog();
  const catalogTeams: CoppaTeam[] = catalog.map((team) => ({ id: team.id, name: team.nome, slug: team.slug, logo: team.logo_path ?? "/logos/logo.png" }));
  const teamById = new Map(catalogTeams.map((team) => [team.id, team]));
  const seasonResult = await supabase.from("stagioni").select("id").eq("attiva", true).maybeSingle();
  if (seasonResult.error) throw seasonResult.error;
  const season = seasonResult.data as RawSeason | null;
  if (!season) return { teams: [], matches: [], initialDay: 1, hasCalendar: false };
  const editionResult = await supabase.from("edizioni_competizioni").select("id,competizioni!inner(codice)").eq("stagione_id", season.id).eq("attiva", true).eq("competizioni.codice", "coppa-fanta-20").maybeSingle();
  if (editionResult.error) throw editionResult.error;
  const edition = editionResult.data as unknown as RawEdition | null;
  if (!edition) return { teams: [], matches: [], initialDay: 1, hasCalendar: false };
  const matchesResult = await supabase.from("partite").select("id,giornata_lega,societa_casa_id,societa_trasferta_id,fantapunti_casa,fantapunti_trasferta,gol_casa,gol_trasferta,stato").eq("edizione_competizione_id", edition.id).order("giornata_lega").order("id");
  if (matchesResult.error) throw matchesResult.error;
  const matches = ((matchesResult.data ?? []) as RawMatch[]).flatMap((row): CoppaMatch[] => {
    const home = teamById.get(Number(row.societa_casa_id)); const away = teamById.get(Number(row.societa_trasferta_id));
    if (!home || !away) return [];
    return [{ id: String(row.id), day: Number(row.giornata_lega), home, away, homeGoals: row.gol_casa === null ? null : Number(row.gol_casa), awayGoals: row.gol_trasferta === null ? null : Number(row.gol_trasferta), homeScore: row.fantapunti_casa === null ? null : Number(row.fantapunti_casa), awayScore: row.fantapunti_trasferta === null ? null : Number(row.fantapunti_trasferta), status: row.stato }];
  });
  const calculatedDays = matches.filter((match) => match.status === "calcolata").map((match) => match.day);
  const importedDays = matches.map((match) => match.day);
  const participantIds = new Set(matches.flatMap((match) => [match.home.id, match.away.id]));
  const teams = catalogTeams.filter((team) => participantIds.has(team.id));
  return { teams, matches, initialDay: matches.length ? (Math.max(0, ...calculatedDays) || Math.min(...importedDays)) : 1, hasCalendar: matches.length > 0 };
}
