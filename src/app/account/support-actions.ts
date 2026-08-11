"use server";

import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export type SupportActionState = { success?: boolean; message: string };

export async function selectSupportedTeamAction(
  _state: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  if (formData.get("confirmed") !== "true") {
    return { message: "Conferma che la scelta resterà definitiva per la stagione." };
  }
  const stagioneId = Number(formData.get("stagioneId"));
  const societaId = Number(formData.get("societaId"));
  if (!Number.isInteger(stagioneId) || stagioneId <= 0 || !Number.isInteger(societaId) || societaId <= 0) {
    return { message: "Selezione non valida." };
  }

  const supabase = await createAuthenticatedSupabaseClient();
  const { error } = await supabase.rpc("select_my_supported_team", {
    p_stagione_id: stagioneId,
    p_societa_id: societaId,
  });
  if (error) {
    if (/support_already_selected/i.test(error.message)) return { message: "Hai già scelto la squadra per questa stagione." };
    if (/official_profile_cannot_support/i.test(error.message)) return { message: "Gli account ufficiali non possono selezionare una squadra tifata." };
    return { message: "Non è stato possibile salvare la squadra tifata." };
  }

  revalidatePath("/account");
  revalidatePath("/user/[username]", "page");
  return { success: true, message: "Squadra tifata confermata." };
}
