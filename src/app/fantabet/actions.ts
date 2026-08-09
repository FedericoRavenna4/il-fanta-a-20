"use server";
import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import type { FantaBetChoice } from "@/lib/fantabet/types";

export type SavePredictionInput = { betId: number; choice: FantaBetChoice; exactHome?: number | null; exactAway?: number | null };
export type SavePredictionResult = { ok: boolean; message: string; prediction?: { id: number; bet_id: number; scelta: string; exact_home: number | null; exact_away: number | null } };
export type SubmissionResult = { ok: boolean; message: string; submittedAt?: string };

export async function saveFantaBetPrediction(input: SavePredictionInput): Promise<SavePredictionResult> {
  if (!Number.isInteger(input.betId) || input.betId <= 0) return { ok: false, message: "Giocata non valida." };
  const exact = input.choice === "ESATTO";
  if (exact && (!Number.isInteger(input.exactHome) || !Number.isInteger(input.exactAway) || input.exactHome! < 0 || input.exactAway! < 0 || input.exactHome! > 20 || input.exactAway! > 20)) return { ok: false, message: "Inserisci un risultato valido (da 0 a 20)." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per giocare." };
  const betResult = await supabase.from("fantabet_bets").select("round_id").eq("id", input.betId).maybeSingle();
  if (betResult.error || !betResult.data) return { ok: false, message: "Giocata non disponibile." };
  const roundResult = await supabase.from("fantabet_rounds").select("status,opens_at,deadline_at").eq("id", betResult.data.round_id).maybeSingle();
  if (roundResult.error || !roundResult.data) return { ok: false, message: "Giornata non disponibile." };
  const now = Date.now();
  if (roundResult.data.status !== "pubblicata" || now < new Date(roundResult.data.opens_at).getTime()) return { ok: false, message: "La schedina non è ancora aperta." };
  if (now >= new Date(roundResult.data.deadline_at).getTime()) return { ok: false, message: "La schedina è chiusa: la deadline è scaduta." };
  const payload = { profile_id: user.id, bet_id: input.betId, scelta: input.choice, exact_home: exact ? input.exactHome! : null, exact_away: exact ? input.exactAway! : null };
  const { data, error } = await supabase.from("fantabet_predictions").upsert(payload, { onConflict: "profile_id,bet_id" }).select("id,bet_id,scelta,exact_home,exact_away").single();
  if (error) {
    const closed = error.message.includes("FANTABET_PRONOSTICI_CHIUSI") || error.code === "42501";
    return { ok: false, message: closed ? "La schedina è chiusa: la deadline è scaduta." : "Non è stato possibile salvare. Riprova." };
  }
  revalidatePath("/fantabet");
  return { ok: true, message: "Salvato", prediction: data as SavePredictionResult["prediction"] };
}

export async function confirmFantaBetSubmission(roundId: number): Promise<SubmissionResult> {
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata non valida." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per confermare la schedina." };
  const { data, error } = await supabase.rpc("confirm_my_fantabet_round", { p_round_id: roundId });
  if (error) {
    const closed = error.message.includes("FANTABET_DEADLINE_SCADUTA");
    const incomplete = error.message.includes("FANTABET_SCHEDINA_INCOMPLETA");
    const missingMigration = error.code === "PGRST202" || /confirm_my_fantabet_round|schema cache/i.test(error.message);
    return { ok: false, message: closed ? "La deadline è scaduta." : incomplete ? "Completa tutte le giocate prima di confermare." : missingMigration ? "Conferma non disponibile: manca la migrazione FantaBet submissions." : "Conferma non riuscita. Riprova." };
  }
  revalidatePath("/fantabet");
  return { ok: true, message: "Schedina confermata", submittedAt: String(data) };
}

export async function reopenFantaBetSubmission(roundId: number): Promise<SubmissionResult> {
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false, message: "Giornata non valida." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Accedi per modificare la schedina." };
  const { error } = await supabase.rpc("reopen_my_fantabet_round", { p_round_id: roundId });
  if (error) {
    return { ok: false, message: error.message.includes("FANTABET_DEADLINE_SCADUTA") ? "La deadline è scaduta: la schedina è definitiva." : "Non è stato possibile riaprire la schedina." };
  }
  revalidatePath("/fantabet");
  return { ok: true, message: "Schedina riaperta" };
}
