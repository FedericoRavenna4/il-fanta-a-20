import type { AccountViewer } from "@/lib/account/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import GlobalEmblemNotifications from "./GlobalEmblemNotifications";

export default async function GlobalEmblemNotificationsServer({ account }: { account: AccountViewer | null }) {
  if (!account?.username) return null;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data } = await supabase.rpc("public_profile_user_emblems", { p_profile_id: account.id });
  const emblems = (data ?? []).flatMap((row) => row.unlocked && row.asset_path ? [{ id: Number(row.id), name: row.nome, rarity: row.rarita as "comune" | "raro" | "epico" | "leggendario", description: row.descrizione, imageUrl: row.asset_path }] : []);
  return <GlobalEmblemNotifications profileId={account.id} initialEmblems={emblems} />;
}
