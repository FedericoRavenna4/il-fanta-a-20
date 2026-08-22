"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapAdminFantaBetSaveError, validateAdminRound, type AdminRoundInput } from "@/lib/fantabet/admin";

export type AdminFantaBetResult = { ok: boolean; message: string; roundId?: number; updatedAt?: string };
export type AdminRoundDeletionPreview = { roundId: number; giornata: number; status: string; opensAt: string; deadlineAt: string; bets: number; predictions: number; participants: number; submissions: number };
export type AdminRoundDeletionResult = AdminFantaBetResult & { preview?: AdminRoundDeletionPreview };
function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }
function safeInput(raw: string): AdminRoundInput | null { try { return JSON.parse(raw) as AdminRoundInput; } catch { return null; } }

export async function saveFantaBetDraftAction(raw: string): Promise<AdminFantaBetResult> {
  await requireImportAdmin();
  const input = safeInput(raw); if (!input) return { ok: false, message: "Configurazione non valida." };
  const errors = validateAdminRound(input); if (errors.length) return { ok: false, message: errors[0] };
  const { data, error } = await admin().rpc("admin_save_fantabet_draft", {
    p_round_id: input.roundId ?? null, p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_stagione_id: input.stagioneId, p_numero_giornata: input.giornata,
    p_opens_at: input.opensAt, p_deadline_at: input.deadlineAt,
    p_bets: input.bets.map((bet) => ({ partita_id: bet.partitaId, bet_type: bet.type, points_value: bet.points, display_order: bet.order })),
  });
  if (error) return { ok: false, message: mapAdminFantaBetSaveError(error.message) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, message: "Salvataggio non riuscito. La bozza precedente è rimasta invariata." };
  revalidatePath("/admin/fantabet"); revalidatePath("/fantabet");
  return { ok: true, message: row.unchanged ? "Bozza già aggiornata." : input.roundId ? "Configurazione salvata." : "Bozza salvata.", roundId: Number(row.round_id), updatedAt: String(row.updated_at) };
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

export async function inspectFantaBetRoundDeletionAction(roundId: number): Promise<AdminRoundDeletionResult> {
  await requireImportAdmin();
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata FantaBet non valida." };
  const { data, error } = await admin().rpc("admin_inspect_fantabet_round", { p_round_id: roundId });
  const row = Array.isArray(data) ? data[0] : data;
  if (error) return { ok: false, message: "Impossibile verificare i dati della giornata." };
  if (!row) return { ok: false, message: "Questa giornata FantaBet non è più disponibile." };
  return { ok: true, message: "Anteprima pronta.", preview: { roundId: Number(row.round_id), giornata: Number(row.numero_giornata), status: String(row.round_status), opensAt: String(row.opens_at), deadlineAt: String(row.deadline_at), bets: Number(row.bets_count), predictions: Number(row.predictions_count), participants: Number(row.participants_count), submissions: Number(row.submissions_count) } };
}

export async function deleteFantaBetRoundAction(roundId: number, acknowledgedUserData: boolean): Promise<AdminFantaBetResult> {
  await requireImportAdmin();
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata FantaBet non valida." };
  const inspected = await admin().rpc("admin_inspect_fantabet_round", { p_round_id: roundId });
  const preview = Array.isArray(inspected.data) ? inspected.data[0] : inspected.data;
  if (inspected.error) return { ok: false, message: "Impossibile verificare i dati della giornata." };
  if (!preview) return { ok: false, message: "Questa giornata FantaBet non è più disponibile." };
  if ((Number(preview.predictions_count) > 0 || Number(preview.submissions_count) > 0) && !acknowledgedUserData) return { ok: false, message: "Conferma di aver compreso che i dati degli utenti verranno eliminati." };
  const { data, error } = await admin().rpc("admin_delete_fantabet_round", { p_round_id: roundId });
  if (error || !data) return { ok: false, message: error?.message.includes("FANTABET_ROUND_NON_DISPONIBILE") ? "Questa giornata FantaBet non è più disponibile." : "Eliminazione non riuscita. Nessun dato è stato rimosso parzialmente." };
  revalidatePath("/admin/fantabet"); revalidatePath("/fantabet");
  return { ok: true, message: "GIORNATA FANTABET ELIMINATA", roundId };
}
