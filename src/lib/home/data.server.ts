import "server-only";

import { loadChampionshipData } from "@/app/campionati-live-preview/data";
import type { LeagueData, LiveChampionshipData, Match } from "@/app/campionati-live-preview/types";
import { createChampionshipMockData } from "@/app/campionati-preview/mock-data";
import { buildCoppaPrototype } from "@/app/coppe/coppa-fanta-fixture";
import { loadActiveCoppaData, type CoppaData } from "@/app/coppe/data";
import { getDemoSeed, isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import type { FantaBetLeaderboardRow, FantaBetRoundOption } from "@/lib/fantabet/server";
import { selectRelevantRound } from "@/lib/fantabet/ui";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import type { CurrentSocieta } from "@/lib/societa/current.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export type HomeLiveData = {
  demo: boolean;
  serverNow: string;
  viewer: { id: string | null; teamId: number | null; relation: "official" | "supporter" | "general" };
  championships: LiveChampionshipData | null;
  fantabet: { round: FantaBetRoundOption | null; submitted: boolean; leaderboard: Array<Pick<FantaBetLeaderboardRow, "profile_id" | "username" | "punti_totali" | "posizione" | "societa_id"> & { team_logo: string | null }> };
  coppa: CoppaData;
};

function demoChampionships(catalog: Awaited<ReturnType<typeof getActiveSocietaCatalog>>): LiveChampionshipData {
  const leagues = createChampionshipMockData(catalog, getDemoSeed(), false).map((league): LeagueData => {
    const matches: Match[] = Object.entries(league.matchdays).flatMap(([day, rows]) => rows.map((match) => ({ ...match, matchday: Number(day), serieAMatchday: Number(day), status: match.homeGoals === null ? "programmata" : "calcolata" })));
    return { id: league.id, competitionCode: league.id, name: league.name, shortName: league.shortName, found: true, initialMatchday: league.currentMatchday, availableMatchdays: Object.keys(league.matchdays).map(Number), teams: league.teams, matches };
  });
  return { season: { id: -1, code: "demo", name: "Stagione demo" }, seasons: [], leagues };
}

function demoCoppa(catalog: Awaited<ReturnType<typeof getActiveSocietaCatalog>>): CoppaData {
  const teams = catalog.slice(0, 100).map((team) => ({ id: team.id, name: team.nome, slug: team.slug, logo: team.logo_path ?? "/logos/logo.png" }));
  const prototype = buildCoppaPrototype(teams, getDemoSeed());
  return { teams, matches: prototype.matches, initialDay: 14, hasCalendar: prototype.matches.length > 0 };
}

export async function loadHomeLiveData(catalogOverride?: CurrentSocieta[]): Promise<HomeLiveData | null> {
  try {
    const demo = isGlobalFakeDataEnabled();
    const serverNow = new Date();
    const catalog = catalogOverride ?? await getActiveSocietaCatalog();
    const supabase = await createAuthenticatedSupabaseClient();
    const [{ data: auth }, championshipResult, coppaResult, roundsResult, leaderboardResult] = await Promise.all([
      supabase.auth.getUser(),
      demo ? Promise.resolve(demoChampionships(catalog)) : loadChampionshipData(undefined, catalog),
      demo ? Promise.resolve(demoCoppa(catalog)) : loadActiveCoppaData(catalog),
      supabase.from("fantabet_rounds").select("id,numero_giornata,status,opens_at,deadline_at").in("status", ["pubblicata", "chiusa", "valutata"]).order("deadline_at", { ascending: false }),
      supabase.rpc("fantabet_global_leaderboard"),
    ]);
    const viewerId = auth.user?.id ?? null;
    const profileResult = viewerId ? await supabase.from("profiles").select("societa_id").eq("id", viewerId).maybeSingle() : { data: null };
    const officialTeamId = profileResult.data?.societa_id == null ? null : Number(profileResult.data.societa_id);
    const supportResult = viewerId && officialTeamId === null ? await supabase.rpc("public_profile_support_summary", { p_profile_id: viewerId }) : { data: [] };
    const support = ((supportResult.data ?? [])[0] ?? null) as { societa_id?: number | null } | null;
    const supportedTeamId = support?.societa_id ? Number(support.societa_id) : null;
    const teamId = officialTeamId ?? supportedTeamId;

    const rounds = (roundsResult.data ?? []).map((round) => ({ id: Number(round.id), numero_giornata: Number(round.numero_giornata), status: String(round.status), opens_at: String(round.opens_at), deadline_at: String(round.deadline_at) }));
    const selectedRaw = selectRelevantRound(rounds, serverNow);
    let selected: FantaBetRoundOption | null = selectedRaw ? { id: selectedRaw.id, number: selectedRaw.numero_giornata, status: selectedRaw.status, opensAt: selectedRaw.opens_at, deadlineAt: selectedRaw.deadline_at } : null;
    let leaderboard = (leaderboardResult.data ?? []).slice(0, 5).map((row) => ({ profile_id: String(row.profile_id), username: String(row.username), punti_totali: Number(row.punti_totali), posizione: Number(row.posizione), societa_id: null as number|null, team_logo: null as string | null }));
    let submitted = false;
    if (demo) {
      selected = { id: -1, number: 4, status: "pubblicata", opensAt: new Date(serverNow.getTime() - 3_600_000).toISOString(), deadlineAt: new Date(serverNow.getTime() + 30 * 3_600_000).toISOString() };
      leaderboard = [
        { profile_id: "demo-1", username: "IlProfeta", punti_totali: 147, posizione: 1 },
        { profile_id: "demo-2", username: "Marcolino92", punti_totali: 139, posizione: 2 },
        { profile_id: "demo-3", username: "MisterX", punti_totali: 136, posizione: 3 },
        { profile_id: "demo-4", username: "LaLavagna", punti_totali: 131, posizione: 4 },
        { profile_id: "demo-5", username: "QuotaVenti", punti_totali: 128, posizione: 5 },
      ].map((row, index) => ({ ...row, societa_id: index === 0 ? catalog[index]?.id ?? null : null, team_logo: catalog[index]?.logo_path ?? null }));
      submitted = Boolean(viewerId);
    } else {
      const profileIds = leaderboard.map((row) => row.profile_id);
      if (profileIds.length) {
        const { data: publicProfiles } = await supabase.from("profiles").select("id,societa_id").in("id", profileIds);
        const officialByProfile = new Map((publicProfiles ?? []).map((profile) => [String(profile.id), profile.societa_id == null ? null : Number(profile.societa_id)]));
        const supportPairs = await Promise.all(profileIds.map(async (profileId) => {
          if (officialByProfile.get(profileId)) return [profileId, null] as const;
          const { data: supportRows } = await supabase.rpc("public_profile_support_summary", { p_profile_id: profileId });
          const support = ((supportRows ?? [])[0] ?? null) as { societa_id?: number | null } | null;
          return [profileId, support?.societa_id == null ? null : Number(support.societa_id)] as const;
        }));
        const supportByProfile = new Map(supportPairs);
        const logoByTeam = new Map(catalog.map((team) => [team.id, team.logo_path]));
        leaderboard = leaderboard.map((row) => ({ ...row, societa_id: officialByProfile.get(row.profile_id) ?? null, team_logo: logoByTeam.get(officialByProfile.get(row.profile_id) ?? supportByProfile.get(row.profile_id) ?? -1) ?? null }));
      }
      if (viewerId && selected) {
        const submissionResult = await supabase.from("fantabet_round_submissions").select("round_id").eq("profile_id", viewerId).eq("round_id", selected.id).maybeSingle();
        submitted = Boolean(submissionResult.data);
      }
    }
    return { demo, serverNow: serverNow.toISOString(), viewer: { id: viewerId, teamId, relation: officialTeamId !== null ? "official" : supportedTeamId !== null ? "supporter" : "general" }, championships: championshipResult, fantabet: { round: selected, submitted, leaderboard }, coppa: coppaResult };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[home] Impossibile caricare i contenuti live", error);
    return null;
  }
}
