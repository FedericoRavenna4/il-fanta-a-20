"use server";
import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import type { FantaBetChoice } from "@/lib/fantabet/types";

export type SavePredictionInput = { betId: number; choice: FantaBetChoice; exactHome?: number | null; exactAway?: number | null };
export type SavePredictionResult = { ok: boolean; message: string; deadlinePassed?: boolean; prediction?: { id: number; bet_id: number; scelta: string; exact_home: number | null; exact_away: number | null } };
export type SubmissionResult = { ok: boolean; message: string; submittedAt?: string; confirmed?: boolean; deadlinePassed?: boolean; serverNow?: string };

export async function saveFantaBetPrediction(input: SavePredictionInput): Promise<SavePredictionResult> {
  if (!Number.isInteger(input.betId) || input.betId <= 0) return { ok: false, message: "Giocata non valida." };
  const exact = input.choice === "ESATTO";
  if (exact && (!Number.isInteger(input.exactHome) || !Number.isInteger(input.exactAway) || input.exactHome! < 0 || input.exactAway! < 0 || input.exactHome! > 20 || input.exactAway! > 20)) return { ok: false, message: "Inserisci un risultato valido (da 0 a 20)." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per giocare." };
  const { data, error } = await supabase.rpc("save_my_fantabet_prediction", {
    p_bet_id: input.betId,
    p_scelta: input.choice,
    p_exact_home: exact ? input.exactHome! : null,
    p_exact_away: exact ? input.exactAway! : null,
  });
  if (error) {
    const closed = error.message.includes("FANTABET_PRONOSTICI_CHIUSI") || error.code === "42501";
    return { ok: false, deadlinePassed: closed, message: closed ? "La schedina è chiusa: la deadline è scaduta." : "Non è stato possibile salvare. Riprova." };
  }
  const row = (Array.isArray(data) ? data[0] : data) as SavePredictionResult["prediction"] | null;
  if (!row) return { ok: false, message: "Salvataggio non verificato. Riprova." };
  revalidatePath("/fantabet");
  return { ok: true, message: "Selezione salvata", prediction: row };
}

export async function confirmFantaBetSubmission(roundId: number, predictions: SavePredictionInput[]): Promise<SubmissionResult> {
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata non valida." };
  if (!Array.isArray(predictions) || predictions.length !== 5) return { ok: false, message: "Completa tutte le giocate prima di confermare." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per confermare la schedina." };
  const payload = predictions.map((prediction) => ({ bet_id: prediction.betId, scelta: prediction.choice, exact_home: prediction.choice === "ESATTO" ? prediction.exactHome ?? null : null, exact_away: prediction.choice === "ESATTO" ? prediction.exactAway ?? null : null }));
  const { data, error } = await supabase.rpc("save_and_confirm_my_fantabet_round", { p_round_id: roundId, p_predictions: payload });
  if (error) {
    const closed = error.message.includes("FANTABET_DEADLINE_SCADUTA");
    const incomplete = error.message.includes("FANTABET_SCHEDINA_INCOMPLETA");
    const unavailable = /FANTABET_ROUND_(NON_TROVATA|NON_DISPONIBILE|NON_CONFERMABILE)/i.test(error.message);
    const missingMigration = error.code === "PGRST202" || /save_and_confirm_my_fantabet_round|schema cache/i.test(error.message);
    return { ok: false, deadlinePassed: closed, message: unavailable ? "Questa giornata FantaBet non è più disponibile." : closed ? "La deadline è scaduta." : incomplete ? "Completa tutte le giocate prima di confermare." : missingMigration ? "Conferma non disponibile: applica la migration FantaBet atomica." : "Conferma non riuscita. Riprova." };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { round_id?: number; profile_id?: string; submitted_at?: string; confirmed?: boolean; prediction_count?: number; server_now?: string } | null;
  if (!row?.confirmed || Number(row.round_id) !== roundId || row.profile_id !== user.id || Number(row.prediction_count) !== predictions.length || !row.submitted_at) return { ok: false, message: "Conferma non verificata dal server. Le selezioni restano salvate: riprova." };
  const verification = await supabase.from("fantabet_round_submissions").select("submitted_at").eq("profile_id", user.id).eq("round_id", roundId).maybeSingle();
  if (verification.error || verification.data?.submitted_at !== row.submitted_at) return { ok: false, message: "Conferma non verificata dal server. Le selezioni restano salvate: riprova." };
  revalidatePath("/fantabet");
  return { ok: true, confirmed: true, message: "Schedina confermata", submittedAt: row.submitted_at, serverNow: row.server_now };
}

export async function reopenFantaBetSubmission(roundId: number): Promise<SubmissionResult> {
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata non valida." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per modificare la schedina." };
  const { error } = await supabase.rpc("reopen_my_fantabet_round", { p_round_id: roundId });
  if (error) {
    const unavailable = /FANTABET_ROUND_(NON_TROVATA|NON_DISPONIBILE|NON_MODIFICABILE)/i.test(error.message);
    return { ok: false, message: unavailable ? "Questa giornata FantaBet non è più disponibile." : error.message.includes("FANTABET_DEADLINE_SCADUTA") ? "La deadline è scaduta: la schedina è definitiva." : "Non è stato possibile riaprire la schedina." };
  }
  revalidatePath("/fantabet");
  return { ok: true, message: "Schedina riaperta" };
}
