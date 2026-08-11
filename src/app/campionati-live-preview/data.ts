import "server-only";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import type { CurrentSocieta } from "@/lib/societa/current.server";
import { deriveAvailableMatchdays } from "./logic";
import type { LeagueData, LeagueId, LiveChampionshipData, Match, Season, Team } from "./types";

const LEAGUES: Array<{ id: LeagueId; code: string; name: string; shortName: string; category: string; group: string | null }> = [
  { id: "serie-a", code: "serie-a", name: "Serie A", shortName: "Serie A", category: "Serie A", group: null },
  { id: "serie-b", code: "serie-b", name: "Serie B", shortName: "Serie B", category: "Serie B", group: null },
  { id: "serie-c-a", code: "serie-c-girone-a", name: "Serie C Girone A", shortName: "C Gir A", category: "Serie C", group: "A" },
  { id: "serie-c-b", code: "serie-c-girone-b", name: "Serie C Girone B", shortName: "C Gir B", category: "Serie C", group: "B" },
  { id: "serie-c-c", code: "serie-c-girone-c", name: "Serie C Girone C", shortName: "C Gir C", category: "Serie C", group: "C" },
];

type RawSeason = { id: number; codice: string; nome: string; attiva: boolean };
type RawEdition = { id: number; competizioni: { codice: string } | { codice: string }[] | null };
type RawMatch = { id: number; edizione_competizione_id: number; giornata_lega: number; giornata_serie_a: number | null; societa_casa_id: number; societa_trasferta_id: number; fantapunti_casa: number | null; fantapunti_trasferta: number | null; gol_casa: number | null; gol_trasferta: number | null; stato: string };

const normalizeGroup = (value: string | null) => value?.replace(/^girone\s+/i, "").trim().toUpperCase() ?? null;

export async function loadChampionshipData(seasonCode?: string): Promise<LiveChampionshipData | null> {
  const supabase = await createAuthenticatedSupabaseClient();
  const seasonsResult = await supabase.from("stagioni").select("id,codice,nome,attiva").order("anno_inizio", { ascending: false });
  if (seasonsResult.error) throw seasonsResult.error;
  const rawSeasons = (seasonsResult.data ?? []) as RawSeason[];
  const selected = rawSeasons.find((s) => seasonCode ? s.codice === seasonCode : s.attiva);
  if (!selected) return null;
  const seasons: Season[] = rawSeasons.map((s) => ({ id: s.id, code: s.codice, name: s.nome }));

  const editionsResult = await supabase.from("edizioni_competizioni").select("id,competizioni!inner(codice)").eq("stagione_id", selected.id).in("competizioni.codice", LEAGUES.map((l) => l.code));
  if (editionsResult.error) throw editionsResult.error;
  const editions = (editionsResult.data ?? []) as unknown as RawEdition[];
  const editionByCode = new Map(editions.map((e) => [Array.isArray(e.competizioni) ? e.competizioni[0]?.codice : e.competizioni?.codice, e]));
  const editionIds = editions.map((e) => e.id);

  const matchesResult = editionIds.length ? await supabase.from("partite").select("id,edizione_competizione_id,giornata_lega,giornata_serie_a,societa_casa_id,societa_trasferta_id,fantapunti_casa,fantapunti_trasferta,gol_casa,gol_trasferta,stato").in("edizione_competizione_id", editionIds).order("giornata_lega") : { data: [], error: null };
  if (matchesResult.error) throw matchesResult.error;
  const rawMatches = (matchesResult.data ?? []) as RawMatch[];
  const teamIds = [...new Set(rawMatches.flatMap((m) => [m.societa_casa_id, m.societa_trasferta_id]))];
  const rawTeams = await getActiveSocietaCatalog();
  const toTeam = (row: CurrentSocieta): Team => ({ id: row.id, name: row.nome, logo: row.logo_path ?? "/logo.png", slug: row.slug });
  const teamById = new Map(rawTeams.filter((t) => teamIds.includes(t.id)).map((t) => [t.id, toTeam(t)]));

  const leagues = LEAGUES.map((definition): LeagueData => {
    const edition = editionByCode.get(definition.code);
    const teams = rawTeams.filter((t) => t.categoria?.toLowerCase() === definition.category.toLowerCase() && (definition.group === null || normalizeGroup(t.girone) === definition.group)).map(toTeam);
    const matches: Match[] = rawMatches.filter((m) => m.edizione_competizione_id === edition?.id).flatMap((m) => {
      const home = teamById.get(m.societa_casa_id) ?? teams.find((t) => t.id === m.societa_casa_id); const away = teamById.get(m.societa_trasferta_id) ?? teams.find((t) => t.id === m.societa_trasferta_id);
      return home && away ? [{ id: String(m.id), matchday: m.giornata_lega, serieAMatchday: m.giornata_serie_a, home, away, homeGoals: m.gol_casa, awayGoals: m.gol_trasferta, homeScore: m.fantapunti_casa, awayScore: m.fantapunti_trasferta, status: m.stato }] : [];
    });
    const importedDays = deriveAvailableMatchdays(matches);
    const lastCalculated = Math.max(0, ...matches.filter((m) => m.status === "calcolata").map((m) => m.matchday));
    const initialMatchday = lastCalculated || importedDays[0] || 1;
    return { id: definition.id, competitionCode: definition.code, name: definition.name, shortName: definition.shortName, found: Boolean(edition), initialMatchday, availableMatchdays: importedDays, teams, matches };
  });
  return { season: { id: selected.id, code: selected.codice, name: selected.nome }, seasons, leagues };
}
