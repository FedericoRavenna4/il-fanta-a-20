"use server";

import { revalidatePath } from "next/cache";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function reviewVerificationAction(formData: FormData) {
  const access = await requireImportAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approved", "rejected"].includes(decision)) return;
  const { error } = await getSupabaseAdminClient().rpc("admin_review_profile_verification_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_reviewer_id: access.userId!,
    p_note_admin: note,
  });
  if (error) throw new Error("Revisione non completata: la richiesta potrebbe essere già stata gestita o la società non è disponibile.");
  revalidatePath("/admin/verifiche");
  revalidatePath("/user/[username]", "page");
}
