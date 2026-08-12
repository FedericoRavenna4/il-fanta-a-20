"use server";

import { revalidatePath } from "next/cache";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type ReviewVerificationState = { success?: boolean; message: string };

function reviewErrorMessage(message: string) {
  if (message.includes("profile_not_eligible")) return "Il profilo non è più idoneo alla verifica.";
  if (message.includes("request_already_reviewed")) return "La richiesta è già stata revisionata.";
  if (message.includes("request_not_found")) return "La richiesta non esiste più.";
  return "Revisione non completata. Controlla i log server per il dettaglio.";
}

export async function reviewVerificationAction(_state: ReviewVerificationState, formData: FormData): Promise<ReviewVerificationState> {
  const access = await requireImportAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approved", "rejected"].includes(decision)) return { message: "Richiesta non valida." };
  const { error } = await getSupabaseAdminClient().rpc("admin_review_profile_verification_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_reviewer_id: access.userId!,
    p_note_admin: note,
  });
  if (error) {
    console.error("[admin/profile-verification] RPC review failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { message: reviewErrorMessage(error.message) };
  }
  revalidatePath("/admin/verifiche");
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/user/[username]", "page");
  return { success: true, message: decision === "approved" ? "Richiesta approvata." : "Richiesta rifiutata." };
}
