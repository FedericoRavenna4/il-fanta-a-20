import { getOnboardingTeamCatalog } from "@/lib/account/onboarding.server";
import type { AccountViewer } from "@/lib/account/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import ProfileOnboarding from "@/app/user/[username]/ProfileOnboarding";

export default async function GlobalProfileOnboarding({ account }: { account: AccountViewer | null }) {
  if (!account?.username) return null;

  const supabase = await createAuthenticatedSupabaseClient();
  const [{ data: profile }, { data: season }] = await Promise.all([
    supabase.from("profiles").select("id,societa_id").eq("id", account.id).maybeSingle(),
    supabase.from("stagioni").select("id,codice").eq("attiva", true).maybeSingle(),
  ]);
  if (!profile || profile.societa_id !== null || !season) return null;

  const [support, verification] = await Promise.all([
    supabase.from("profile_supports").select("societa_id").eq("profile_id", profile.id).eq("stagione_id", season.id).maybeSingle(),
    supabase.from("profile_verification_requests").select("status").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (support.data || verification.data?.status === "pending") return null;

  const teams = await getOnboardingTeamCatalog();
  if (!teams.length) return null;
  return <ProfileOnboarding seasonId={Number(season.id)} seasonCode={season.codice} teams={teams} rejected={verification.data?.status === "rejected"} />;
}
