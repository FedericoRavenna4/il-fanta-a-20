import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { getRose, type RosaGiocatore } from "@/lib/rose";
import { isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function loadRoseForSocieta(societaId: number): Promise<RosaGiocatore[]> {
  noStore();
  if (isGlobalFakeDataEnabled()) {
    return getRose().filter((row) => row.squadraId === societaId);
  }
  const db = getSupabaseAdminClient() as unknown as SupabaseClient;
  const [{ data: seasons, error: seasonError }, { data: players, error: playerError }] = await Promise.all([
    db.from("stagioni").select("id,codice"),
    db.from("rose_giocatori").select("stagione_id,societa_id,giocatore,squadra_reale,ruolo,prezzo").eq("societa_id", societaId).order("ruolo").order("giocatore"),
  ]);
  if (seasonError || playerError) throw new Error("Impossibile caricare la rosa della società.");
  const seasonCodes = new Map((seasons ?? []).map((season) => [Number(season.id), String(season.codice)]));
  return (players ?? []).flatMap((row): RosaGiocatore[] => {
    const stagione = seasonCodes.get(Number(row.stagione_id));
    if (!stagione) return [];
    return [{ stagione, squadraId: Number(row.societa_id), ruolo: String(row.ruolo), giocatore: String(row.giocatore), squadraReale: String(row.squadra_reale ?? ""), costo: Number(row.prezzo) }];
  });
}
