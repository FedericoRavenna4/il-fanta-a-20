import "server-only";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getRose } from "@/lib/rose";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import { currentTeamStanding, recentTeamStats, selectRelevantRound } from "./ui";
import { scorePlay } from "./logic";
import type { FantaBetChoice, FantaBetMatchResult, FantaBetType } from "./types";

export type FantaBetPredictionRow = { id: number; bet_id: number; scelta: string; exact_home: number | null; exact_away: number | null };
export type FantaBetTeam = { id: number; name: string; logo: string; slug: string; category?: string | null; group?: string | null };
export type FantaBetStats = ReturnType<typeof recentTeamStats> & { position: number | null; points: number | null };
export type FantaBetBetView = {
  id: number; type: FantaBetType; points: number; order: number;
  home: FantaBetTeam; away: FantaBetTeam;
  homeStats: FantaBetStats; awayStats: FantaBetStats;
  homeRoster: Array<{ role: string; player: string }>;
  awayRoster: Array<{ role: string; player: string }>;
  result: FantaBetMatchResult;
};
export type FantaBetLeaderboardRow = { profile_id: string; username: string; societa_id: number | null; team_id: number | null; team_name: string | null; team_logo: string | null; punti_pronostici: number; punti_bonus_costanza: number; punti_tifo: number; punti_bonus_tifo: number; punti_totali: number; giornate_giocate: number; pronostici_corretti: number; schedine_perfette: number; streak_attuale: number; posizione: number };
export type FantaBetRoundLeaderboardRow = { profile_id: string; username: string; societa_id: number | null; punti_pronostici: number; punti_bonus_costanza: number; punti_totali: number; pronostici_corretti: number; schedina_perfetta: boolean; posizione: number };
export type FantaBetRoundOption = { id: number; number: number; status: string; opensAt: string; deadlineAt: string };
export type FantaBetPageData = {
  serverNow: string;
  viewerId: string | null;
  round: null | { id: number; number: number; status: string; opensAt: string; deadlineAt: string; requiredPredictions: number; fullyEvaluable: boolean };
  bets: FantaBetBetView[];
  predictions: FantaBetPredictionRow[];
  submission: null | { submittedAt: string };
  leaderboard: FantaBetLeaderboardRow[];
  roundLeaderboard: FantaBetRoundLeaderboardRow[];
  availableRounds: FantaBetRoundOption[];
};

type RawRound = { id: number; stagione_id: number; numero_giornata: number; opens_at: string; deadline_at: string; status: string; required_predictions: number };
type RawBet = { id: number; partita_id: number; bet_type: FantaBetType; points_value: number; display_order: number };
type RawMatch = { id: number; edizione_competizione_id: number; giornata_lega: number; societa_casa_id: number; societa_trasferta_id: number; gol_casa: number | null; gol_trasferta: number | null; fantapunti_casa: number | null; fantapunti_trasferta: number | null; stato: string };
export async function loadFantaBetPageData(requestedRoundId?: number): Promise<FantaBetPageData> {
  const serverNow = new Date();
  const supabase = await createAuthenticatedSupabaseClient();
  const [{ data: auth }, roundsResult, leaderboardResult, currentSocieta] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("fantabet_rounds").select("id,stagione_id,numero_giornata,opens_at,deadline_at,status,required_predictions").order("deadline_at", { ascending: false }),
    supabase.rpc("fantabet_global_leaderboard"),
    getActiveSocietaCatalog(),
  ]);
  const viewerId = auth.user?.id ?? null;
  const rounds = (roundsResult.data ?? []) as RawRound[];
  const selectableRounds = rounds.filter((round) => ["pubblicata", "chiusa", "valutata"].includes(round.status));
  const requested = Number.isInteger(requestedRoundId) ? selectableRounds.find((round) => round.id === requestedRoundId) : null;
  const selected = requested ?? selectRelevantRound(selectableRounds, serverNow);
  const leaderboardRaw = (leaderboardResult.data ?? []) as Omit<FantaBetLeaderboardRow, "societa_id">[];
  const roundLeaderboardResult = selected ? await supabase.rpc("fantabet_round_leaderboard", { p_round_id: selected.id }) : { data: [], error: null };
  const roundLeaderboardRaw = (roundLeaderboardResult.data ?? []) as Omit<FantaBetRoundLeaderboardRow, "societa_id">[];
  const profileIds = [...new Set([...leaderboardRaw.map((row) => row.profile_id), ...roundLeaderboardRaw.map((row) => row.profile_id)])];
  const profileResult = profileIds.length ? await supabase.from("profiles").select("id,societa_id").in("id", profileIds) : { data: [], error: null };
  const profiles = (profileResult.data ?? []) as Array<{ id: string; societa_id: number | null }>;
  const societyByProfile = new Map(profiles.map((row) => [row.id, row.societa_id]));
  const communityIds = profiles.filter((profile) => profile.societa_id === null).map((profile) => profile.id);
  const supportResults = await Promise.all(communityIds.map(async (profileId) => {
    const { data } = await supabase.rpc("public_profile_support_summary", { p_profile_id: profileId });
    const support = ((data ?? [])[0] ?? null) as { societa_id?: number } | null;
    return [profileId, support?.societa_id ? Number(support.societa_id) : null] as const;
  }));
  const supportByProfile = new Map(supportResults);
  const catalog = new Map(currentSocieta.map((team) => [team.id, team]));
  const decorateLeaderboardRow = <T extends { profile_id: string }>(row: T) => {
    const officialId = societyByProfile.get(row.profile_id) ?? null;
    const teamId = officialId ?? supportByProfile.get(row.profile_id) ?? null;
    const team = teamId ? catalog.get(teamId) ?? null : null;
    return { ...row, societa_id: officialId, team_id: teamId, team_name: team?.nome ?? null, team_logo: team?.logo_path ?? null };
  };
  const leaderboard = leaderboardRaw.map(decorateLeaderboardRow);
  const roundLeaderboard = roundLeaderboardRaw.map(decorateLeaderboardRow);
  const availableRounds = [...selectableRounds].sort((a, b) => a.numero_giornata - b.numero_giornata || a.id - b.id).map((round) => ({ id: round.id, number: round.numero_giornata, status: round.status, opensAt: round.opens_at, deadlineAt: round.deadline_at }));
  if (!selected) return { serverNow: serverNow.toISOString(), viewerId, round: null, bets: [], predictions: [], submission: null, leaderboard, roundLeaderboard, availableRounds };

  const betsResult = await supabase.from("fantabet_bets").select("id,partita_id,bet_type,points_value,display_order").eq("round_id", selected.id).order("display_order");
  const rawBets = (betsResult.data ?? []) as RawBet[];
  const matchIds = rawBets.map((bet) => bet.partita_id);
  const matchesResult = matchIds.length ? await supabase.from("partite").select("id,edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id,gol_casa,gol_trasferta,fantapunti_casa,fantapunti_trasferta,stato").in("id", matchIds) : { data: [], error: null };
  const selectedMatches = (matchesResult.data ?? []) as RawMatch[];
  const editionIds = [...new Set(selectedMatches.map((match) => match.edizione_competizione_id))];
  const historyResult = editionIds.length ? await supabase.from("partite").select("id,edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id,gol_casa,gol_trasferta,fantapunti_casa,fantapunti_trasferta,stato").in("edizione_competizione_id", editionIds).eq("stato", "calcolata") : { data: [], error: null };
  const history = ((historyResult.data ?? []) as unknown as RawMatch[]).filter((match) => match.gol_casa !== null && match.gol_trasferta !== null);
  const resolveTeam = (id: number): FantaBetTeam => {
    const team = catalog.get(id);
    return team
      ? { id: team.id, name: team.nome, logo: team.logo_path ?? "/logos/logo.png", slug: team.slug, category: team.categoria, group: team.girone }
      : { id, name: "Società non disponibile", logo: "/logos/logo.png", slug: "", category: null, group: null };
  };
  const seasonResult = await supabase.from("stagioni").select("codice").eq("id", selected.stagione_id).maybeSingle();
  const seasonCode = (seasonResult.data as { codice?: string } | null)?.codice;
  const rosters = seasonCode ? getRose().filter((player) => player.stagione === seasonCode) : [];
  const matchById = new Map(selectedMatches.map((match) => [match.id, match]));
  const bets = rawBets.flatMap((bet): FantaBetBetView[] => {
    const match = matchById.get(bet.partita_id); if (!match) return [];
    const home = resolveTeam(match.societa_casa_id); const away = resolveTeam(match.societa_trasferta_id);
    const editionMatches = history.filter((item) => item.edizione_competizione_id === match.edizione_competizione_id && item.giornata_lega < match.giornata_lega).map((item) => ({ matchday: item.giornata_lega, homeId: item.societa_casa_id, awayId: item.societa_trasferta_id, homeGoals: item.gol_casa!, awayGoals: item.gol_trasferta!, homeFantasy: item.fantapunti_casa, awayFantasy: item.fantapunti_trasferta }));
    return [{ id: bet.id, type: bet.bet_type, points: bet.points_value, order: bet.display_order, home, away, homeStats: { ...recentTeamStats(editionMatches, home.id), ...currentTeamStanding(editionMatches, home.id) }, awayStats: { ...recentTeamStats(editionMatches, away.id), ...currentTeamStanding(editionMatches, away.id) }, homeRoster: rosters.filter((player) => player.squadraId === home.id).map((player) => ({ role: player.ruolo, player: player.giocatore })), awayRoster: rosters.filter((player) => player.squadraId === away.id).map((player) => ({ role: player.ruolo, player: player.giocatore })), result: { status: match.stato, homeGoals: match.gol_casa, awayGoals: match.gol_trasferta, homeFantasyPoints: match.fantapunti_casa, awayFantasyPoints: match.fantapunti_trasferta } }];
  });
  const predictionsResult = viewerId ? await supabase.from("fantabet_predictions").select("id,bet_id,scelta,exact_home,exact_away").in("bet_id", rawBets.map((bet) => bet.id)) : { data: [], error: null };
  const predictions = (predictionsResult.data ?? []) as FantaBetPredictionRow[];
  const submissionResult = viewerId ? await supabase.from("fantabet_round_submissions").select("submitted_at").eq("profile_id", viewerId).eq("round_id", selected.id).maybeSingle() : { data: null, error: null };
  const submittedAt = (submissionResult.data as { submitted_at?: string } | null)?.submitted_at ?? null;
  const fullyEvaluable = bets.length === selected.required_predictions && bets.every((bet) => scorePlay(bet.type, bet.points, { choice: "1" as FantaBetChoice }, bet.result).evaluable);
  return { serverNow: serverNow.toISOString(), viewerId, round: { id: selected.id, number: selected.numero_giornata, status: selected.status, opensAt: selected.opens_at, deadlineAt: selected.deadline_at, requiredPredictions: selected.required_predictions, fullyEvaluable }, bets, predictions, submission: submittedAt ? { submittedAt } : null, leaderboard, roundLeaderboard, availableRounds };
}
