"use server";

import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export type VerificationActionState = { success?: boolean; message: string };

export async function requestProfileVerificationAction(
  _state: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cognome = String(formData.get("cognome") ?? "").trim();
  const societaId = Number(formData.get("societaId"));
  if (nome.length < 2 || nome.length > 80 || cognome.length < 2 || cognome.length > 80) {
    return { message: "Inserisci nome e cognome validi." };
  }
  if (!Number.isInteger(societaId) || societaId <= 0) return { message: "Seleziona una società valida." };

  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Sessione non valida. Accedi nuovamente." };
  const { error } = await supabase.rpc("request_my_profile_verification", {
    p_nome: nome,
    p_cognome: cognome,
    p_societa_id: societaId,
  });
  if (error) {
    if (/verification_request_conflict/i.test(error.message)) return { message: "Esiste già una richiesta in attesa o la società non è disponibile." };
    if (/active_support_already_selected/i.test(error.message)) return { message: "Hai già scelto una squadra da tifare per questa stagione." };
    return { message: "Non è stato possibile inviare la richiesta." };
  }
  revalidatePath("/user/[username]", "page");
  return { success: true, message: "Richiesta inviata." };
}
