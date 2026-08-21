import "server-only";

import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getCatalogoEmblemi, type EmblemaPosseduto } from "@/lib/emblemi";
import { versionAvatarUrl } from "@/lib/account/avatar";

export type AccountSupportHubData = {
  kind: "official" | "supporter" | "selectable";
  activeSeason: { id: number; code: string } | null;
  officialSocietaId: number | null;
  supportedSocietaId: number | null;
  selectedAt: string | null;
  bonusTotal: number;
  bonusEvents: Array<{ editionId: number; stagioneId: number; societaId: number; points: number; recognizedAt: string }>;
};

export async function getMySupportHubData(): Promise<AccountSupportHubData | null> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, seasonResult] = await Promise.all([
    supabase.from("profiles").select("societa_id").eq("id", user.id).maybeSingle(),
    supabase.from("stagioni").select("id,codice").eq("attiva", true).maybeSingle(),
  ]);
  if (!profileResult.data) return null;

  const activeSeason = seasonResult.data ? { id: Number(seasonResult.data.id), code: seasonResult.data.codice } : null;
  const supportResult = activeSeason
    ? await supabase.from("profile_supports").select("societa_id,selected_at").eq("profile_id", user.id).eq("stagione_id", activeSeason.id).maybeSingle()
    : { data: null };
  const [bonusResult, ineligibilityResult] = await Promise.all([
    supabase.from("fantabet_support_bonus_events").select("edizione_competizione_id,stagione_id,societa_id,punti,recognized_at").eq("profile_id", user.id).order("recognized_at", { ascending: false }),
    supabase.from("profile_support_ineligibilities").select("stagione_id").eq("profile_id", user.id),
  ]);
  const ineligibleSeasons = new Set((ineligibilityResult.data ?? []).map((row) => Number(row.stagione_id)));
  const events = (bonusResult.data ?? []).filter((event) => !ineligibleSeasons.has(Number(event.stagione_id))).map((event) => ({
    editionId: Number(event.edizione_competizione_id), stagioneId: Number(event.stagione_id), societaId: Number(event.societa_id), points: Number(event.punti), recognizedAt: event.recognized_at,
  }));
  const officialSocietaId = profileResult.data.societa_id === null ? null : Number(profileResult.data.societa_id);
  const activeSupportIsEligible = activeSeason !== null && !ineligibleSeasons.has(activeSeason.id);
  const supportedSocietaId = supportResult.data && activeSupportIsEligible ? Number(supportResult.data.societa_id) : null;

  return {
    kind: officialSocietaId !== null ? "official" : supportedSocietaId !== null ? "supporter" : "selectable",
    activeSeason, officialSocietaId, supportedSocietaId,
    selectedAt: supportResult.data?.selected_at ?? null,
    bonusTotal: officialSocietaId === null ? events.reduce((sum, event) => sum + event.points, 0) : 0,
    bonusEvents: events,
  };
}

export async function getActiveSupporterCounts() {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.rpc("active_supporter_counts");
  if (error) return new Map<number, number>();
  return new Map((data ?? []).map((row) => [Number(row.societa_id), Number(row.tifosi)]));
}

export type ActiveSupporter = { username: string; avatarUrl: string | null };

export async function getVerifiedSocietaUsernames(societaId: number): Promise<string[]> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("societa_id", societaId)
    .order("username_normalizzato");
  if (error) return [];
  return (data ?? []).map((profile) => profile.username);
}

export async function getActiveSupporters(societaId: number): Promise<ActiveSupporter[]> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.rpc("active_supporters", { p_societa_id: societaId });
  if (error) return [];
  return (data ?? []).map((row) => {
    const avatarPath = typeof row.avatar_url === "string" && row.avatar_url ? row.avatar_url : null;
    const publicAvatarUrl = avatarPath ? supabase.storage.from("account-avatars").getPublicUrl(avatarPath).data.publicUrl : null;
    return {
      username: String(row.username),
      avatarUrl: versionAvatarUrl(publicAvatarUrl, row.avatar_updated_at ?? null),
    };
  });
}

type SocietaSupportEmblemRow = {
  emblem_key: string;
  stato: "Sbloccato" | "Da difendere";
  unlocked_at: string;
  stagione: string | null;
};

type SocietaDefendingEmblemRow = {
  societa_id?: number;
  emblem_key: string;
  stato: "Da difendere";
  record_value: number | string | null;
};

export type SocietaDefendingEmblem = EmblemaPosseduto & { societaId: number };

export async function getSocietaSupportEmblems(societaId: number): Promise<EmblemaPosseduto[]> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.rpc("public_societa_support_emblems", { p_societa_id: societaId });
  if (error) return [];
  const catalog = new Map(getCatalogoEmblemi().map((emblem) => [emblem.chiave, emblem]));
  return ((data ?? []) as SocietaSupportEmblemRow[]).flatMap((row) => {
    const emblem = catalog.get(row.emblem_key);
    return emblem ? [{ ...emblem, stato: row.stato } satisfies EmblemaPosseduto] : [];
  });
}

export async function getSocietaDefendingEmblems(societaId: number): Promise<EmblemaPosseduto[] | null> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.rpc("public_societa_defending_emblems", { p_societa_id: societaId });
  if (error) return null;
  const catalog = new Map(getCatalogoEmblemi().map((emblem) => [emblem.chiave, emblem]));
  return ((data ?? []) as SocietaDefendingEmblemRow[]).flatMap((row) => {
    const emblem = catalog.get(row.emblem_key);
    if (!emblem || row.record_value === null) return [];
    return [{ ...emblem, stato: row.stato, record: String(Number(row.record_value)) } satisfies EmblemaPosseduto];
  });
}

export async function getAllSocietaDefendingEmblems(): Promise<SocietaDefendingEmblem[] | null> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.rpc("public_all_societa_defending_emblems");
  if (error) return null;
  const catalog = new Map(getCatalogoEmblemi().map((emblem) => [emblem.chiave, emblem]));
  return ((data ?? []) as SocietaDefendingEmblemRow[]).flatMap((row) => {
    const emblem = catalog.get(row.emblem_key);
    if (!emblem || row.societa_id === undefined || row.record_value === null) return [];
    return [{ ...emblem, societaId: Number(row.societa_id), stato: row.stato, record: String(Number(row.record_value)) } satisfies SocietaDefendingEmblem];
  });
}
