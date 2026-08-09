import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { FANTABET_ADMIN_SEASON, roundCompletion } from "./admin";

export type AdminSeason = { id: number; label: string };
export type AdminMatch = { id: number; stagioneId: number; league: string; giornata: number; stato: string; home: { name: string; logo: string }; away: { name: string; logo: string } };
export type AdminRound = { id: number; stagioneId: number; stagione: string; giornata: number; opensAt: string; deadlineAt: string; status: string; required: number; bets: Array<{ id: number; partitaId: number; type: string; points: number; order: number }>; participants: number; complete: number; confirmed: number; completion: number; resultsAvailable: boolean };
export type FantaBetAdminData = { season: AdminSeason; matches: AdminMatch[]; rounds: AdminRound[]; serverNow: string };

function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }

export async function getFantaBetAdminData(): Promise<FantaBetAdminData> {
  await requireImportAdmin();
  const db = admin();
  const [seasonResult, editionResult, roundResult, companyResult] = await Promise.all([
    db.from("stagioni").select("id,codice").order("id", { ascending: false }),
    db.from("edizioni_competizioni").select("id,stagione_id,competizione_id").eq("attiva", true),
    db.from("fantabet_rounds").select("id,stagione_id,numero_giornata,opens_at,deadline_at,status,required_predictions").order("deadline_at", { ascending: false }),
    db.from("societa").select("id,nome_ufficiale,logo_path"),
  ]);
  if (seasonResult.error || editionResult.error || roundResult.error || companyResult.error) throw new Error("Impossibile caricare il pannello FantaBet.");
  const fixedSeason = (seasonResult.data ?? []).find((item) => String(item.codice) === FANTABET_ADMIN_SEASON);
  if (!fixedSeason) throw new Error(`Stagione ${FANTABET_ADMIN_SEASON} non configurata.`);
  const editions = (editionResult.data ?? []).filter((item) => Number(item.stagione_id) === Number(fixedSeason.id));
  const editionIds = editions.map((item) => Number(item.id));
  const competitionIds = [...new Set(editions.map((item) => Number(item.competizione_id)))];
  const competitionResult = competitionIds.length ? await db.from("competizioni").select("id,divisione_riferimento,tipo").in("id", competitionIds) : { data: [], error: null };
  if (competitionResult.error) throw new Error("Impossibile caricare le leghe.");
  const matchResult = editionIds.length ? await db.from("partite").select("id,edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id,stato").in("edizione_competizione_id", editionIds).order("giornata_lega") : { data: [], error: null };
  if (matchResult.error) throw new Error("Impossibile caricare le partite.");
  const rounds = roundResult.data ?? [];
  const roundIds = rounds.map((item) => Number(item.id));
  const betsResult = roundIds.length ? await db.from("fantabet_bets").select("id,round_id,partita_id,bet_type,points_value,display_order").in("round_id", roundIds).order("display_order") : { data: [], error: null };
  if (betsResult.error) throw new Error("Impossibile caricare le giocate.");
  const betIds = (betsResult.data ?? []).map((item) => Number(item.id));
  const [predictionResult, submissionResult] = await Promise.all([
    betIds.length ? db.from("fantabet_predictions").select("profile_id,bet_id").in("bet_id", betIds) : Promise.resolve({ data: [], error: null }),
    roundIds.length ? db.from("fantabet_round_submissions").select("profile_id,round_id").in("round_id", roundIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (predictionResult.error || submissionResult.error) throw new Error("Impossibile caricare il monitoraggio.");
  const seasonMap = new Map((seasonResult.data ?? []).map((item) => [Number(item.id), String(item.codice)]));
  const editionSeason = new Map(editions.map((item) => [Number(item.id), Number(item.stagione_id)]));
  const competitionMap = new Map((competitionResult.data ?? []).map((item) => [Number(item.id), String(item.divisione_riferimento ?? "")]));
  const editionLeague = new Map(editions.map((item) => [Number(item.id), competitionMap.get(Number(item.competizione_id)) ?? ""]));
  const companyMap = new Map((companyResult.data ?? []).map((item) => [Number(item.id), { name: String(item.nome_ufficiale), logo: String(item.logo_path || "/logos/logo.png") }]));
  const matches = (matchResult.data ?? []).map((item) => ({ id: Number(item.id), stagioneId: editionSeason.get(Number(item.edizione_competizione_id)) ?? 0, league: editionLeague.get(Number(item.edizione_competizione_id)) ?? "", giornata: Number(item.giornata_lega), stato: String(item.stato), home: companyMap.get(Number(item.societa_casa_id)) ?? { name: "Società", logo: "/logos/logo.png" }, away: companyMap.get(Number(item.societa_trasferta_id)) ?? { name: "Società", logo: "/logos/logo.png" } }));
  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const adminRounds = rounds.map((round): AdminRound => {
    const id = Number(round.id); const roundBets = (betsResult.data ?? []).filter((bet) => Number(bet.round_id) === id);
    const ids = new Set(roundBets.map((bet) => Number(bet.id)));
    const predictions = (predictionResult.data ?? []).filter((row) => ids.has(Number(row.bet_id)));
    const grouped = new Map<string, number>(); predictions.forEach((row) => grouped.set(String(row.profile_id), (grouped.get(String(row.profile_id)) ?? 0) + 1));
    const participants = grouped.size; const complete = [...grouped.values()].filter((count) => count === Number(round.required_predictions)).length;
    const confirmed = (submissionResult.data ?? []).filter((row) => Number(row.round_id) === id).length;
    return { id, stagioneId: Number(round.stagione_id), stagione: seasonMap.get(Number(round.stagione_id)) ?? String(round.stagione_id), giornata: Number(round.numero_giornata), opensAt: String(round.opens_at), deadlineAt: String(round.deadline_at), status: String(round.status), required: Number(round.required_predictions), bets: roundBets.map((bet) => ({ id: Number(bet.id), partitaId: Number(bet.partita_id), type: String(bet.bet_type), points: Number(bet.points_value), order: Number(bet.display_order) })), participants, complete, confirmed, completion: roundCompletion(participants, confirmed), resultsAvailable: roundBets.length === 5 && roundBets.every((bet) => matchMap.get(Number(bet.partita_id))?.stato === "calcolata") };
  });
  return { season: { id: Number(fixedSeason.id), label: FANTABET_ADMIN_SEASON }, matches, rounds: adminRounds, serverNow: new Date().toISOString() };
}
