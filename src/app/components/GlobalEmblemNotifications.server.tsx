import type { AccountViewer } from "@/lib/account/server";
import { getCatalogoEmblemi } from "@/lib/emblemi";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import GlobalEmblemNotifications from "./GlobalEmblemNotifications";

export default async function GlobalEmblemNotificationsServer({ account }: { account: AccountViewer | null }) {
  if (!account?.username) return null;
  const supabase = await createAuthenticatedSupabaseClient();
  const [{ data }, { data: societaData }, societaCatalog] = await Promise.all([
    supabase.rpc("public_profile_user_emblems", { p_profile_id: account.id }),
    supabase.rpc("my_pending_societa_emblem_notifications"),
    getActiveSocietaCatalog(),
  ]);
  const emblems = (data ?? []).flatMap((row) => row.unlocked && row.asset_path ? [{ id: Number(row.id), name: row.nome, rarity: row.rarita as "comune" | "raro" | "epico" | "leggendario", description: row.descrizione, imageUrl: row.asset_path }] : []);
  const catalog = new Map(getCatalogoEmblemi().map((emblem) => [emblem.chiave, emblem]));
  const societaById = new Map(societaCatalog.map((societa) => [societa.id, societa]));
  const societaEmblems = (societaData ?? []).flatMap((row) => {
    const emblem = catalog.get(row.emblem_key);
    const societa = societaById.get(Number(row.societa_id));
    if (!emblem || emblem.tipo !== "Sbloccabile" || !societa) return [];
    const rarity = emblem.categoria === "Base" ? "comune" : emblem.categoria.toLocaleLowerCase("it") as "comune" | "raro" | "epico" | "leggendario";
    if (!(["comune", "raro", "epico", "leggendario"] as const).includes(rarity)) return [];
    return [{ id: Number(row.notification_id), societaId: societa.id, societaName: societa.nome, name: emblem.nome, rarity, description: emblem.descrizione ?? "", imageUrl: emblem.immagine, audience: row.audience }];
  });
  return <GlobalEmblemNotifications profileId={account.id} initialEmblems={emblems} initialSocietaEmblems={societaEmblems} />;
}
