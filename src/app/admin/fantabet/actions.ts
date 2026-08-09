"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { validateAdminRound, type AdminRoundInput } from "@/lib/fantabet/admin";

export type AdminFantaBetResult = { ok: boolean; message: string; roundId?: number };
function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }
function safeInput(raw: string): AdminRoundInput | null { try { return JSON.parse(raw) as AdminRoundInput; } catch { return null; } }

export async function saveFantaBetDraftAction(raw: string): Promise<AdminFantaBetResult> {
  await requireImportAdmin();
  const input = safeInput(raw); if (!input) return { ok: false, message: "Configurazione non valida." };
  const errors = validateAdminRound(input); if (errors.length) return { ok: false, message: errors[0] };
  const db = admin();
  const duplicate = await db.from("fantabet_rounds").select("id").eq("stagione_id", input.stagioneId).eq("numero_giornata", input.giornata).maybeSingle();
  if (duplicate.error) return { ok: false, message: "Impossibile verificare la giornata." };
  if (duplicate.data && Number(duplicate.data.id) !== Number(input.roundId)) return { ok: false, message: "Esiste già una round per questa stagione e giornata." };
  let roundId = Number(input.roundId || 0);
  if (roundId) {
    const current = await db.from("fantabet_rounds").select("status,opens_at").eq("id", roundId).single();
    const editable = current.data?.status === "bozza" || (current.data?.status === "pubblicata" && Date.now() < new Date(current.data.opens_at).getTime());
    if (current.error || !editable) return { ok: false, message: "La configurazione è congelata dall’apertura della round." };
    const update = await db.from("fantabet_rounds").update({ stagione_id: input.stagioneId, numero_giornata: input.giornata, opens_at: input.opensAt, deadline_at: input.deadlineAt }).eq("id", roundId);
    if (update.error) return { ok: false, message: "Impossibile aggiornare la bozza." };
    const removed = await db.from("fantabet_bets").delete().eq("round_id", roundId);
    if (removed.error) return { ok: false, message: "Impossibile aggiornare le giocate." };
  } else {
    const created = await db.from("fantabet_rounds").insert({ stagione_id: input.stagioneId, numero_giornata: input.giornata, opens_at: input.opensAt, deadline_at: input.deadlineAt, status: "bozza", round_type: "STANDARD", rules_version: 1, required_predictions: 5, perfect_multiplier: 2, consistency_block_size: 5, consistency_bonus_points: 10 }).select("id").single();
    if (created.error || !created.data) return { ok: false, message: "Impossibile creare la bozza. Verifica che la giornata non esista già." };
    roundId = Number(created.data.id);
  }
  const inserted = await db.from("fantabet_bets").insert(input.bets.map((bet) => ({ round_id: roundId, partita_id: bet.partitaId, bet_type: bet.type, points_value: bet.points, display_order: bet.order })));
  if (inserted.error) { if (!input.roundId) await db.from("fantabet_rounds").delete().eq("id", roundId); return { ok: false, message: "Impossibile salvare le cinque giocate." }; }
  revalidatePath("/admin/fantabet"); revalidatePath("/fantabet"); return { ok: true, message: input.roundId ? "Configurazione salvata." : "Bozza salvata.", roundId };
}

export async function publishFantaBetRoundAction(roundId: number): Promise<AdminFantaBetResult> {
  await requireImportAdmin();
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Round non valida." };
  const db = admin();
  const result = await db.from("fantabet_rounds").update({ status: "pubblicata" }).eq("id", roundId).eq("status", "bozza").select("id").maybeSingle();
  if (result.error) return { ok: false, message: "Pubblicazione rifiutata: controlla formato, partite, apertura e deadline." };
  if (!result.data) return { ok: false, message: "La round non è più una bozza modificabile." };
  revalidatePath("/admin/fantabet"); revalidatePath("/fantabet"); return { ok: true, message: "Schedina pubblicata.", roundId };
}
