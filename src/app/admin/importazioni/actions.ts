"use server";

import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { createAuthenticatedPreview, publishAuthenticatedImport } from "@/lib/admin-import/preview.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/admin-import/types";

type SupabaseLikeError = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };

function actionError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  const value = error && typeof error === "object" ? error as SupabaseLikeError : null;
  const message = typeof value?.message === "string" ? value.message : fallback;
  if (process.env.NODE_ENV === "development") console.error("[admin/importazioni] Operazione fallita", { message, code: value?.code ?? null, details: value?.details ?? null, hint: value?.hint ?? null });
  return message;
}

export async function createImportPreviewAction(formData: FormData): Promise<ActionResult> {
  try {
    const access = await requireImportAdmin();
    return { ok: true, preview: await createAuthenticatedPreview(formData, access.userId!) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Impossibile creare l’anteprima." };
  }
}

export async function publishImportAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    await requireImportAdmin();
    await publishAuthenticatedImport(formData);
    return { ok: true, message: "Importazione pubblicata correttamente." };
  } catch (error) {
    return { ok: false, message: actionError(error, "Pubblicazione non riuscita.") };
  }
}

export async function inspectCalendarDeletionAction(importId: string) {
  try {
    await requireImportAdmin();
    const db = getSupabaseAdminClient() as unknown as SupabaseClient;
    const { data, error } = await db.rpc("admin_inspect_calendar_import", { p_import_id: importId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false as const, message: "Calendario pubblicato non trovato." };
    return { ok: true as const, importId, matches: Number(row.matches), calculated: Number(row.calculated), rests: Number(row.rests), fantabetDependencies: Number(row.fantabet_dependencies) };
  } catch (error) {
    return { ok: false as const, message: actionError(error, "Eliminazione non autorizzata.") };
  }
}

export async function deletePublishedCalendarAction(importId: string, acknowledgeCalculated: boolean) {
  try {
    const access = await requireImportAdmin();
    const db = getSupabaseAdminClient() as unknown as SupabaseClient;
    const { data, error } = await db.rpc("admin_delete_calendar_import", { p_import_id: importId, p_deleted_by: access.userId, p_acknowledge_calculated: acknowledgeCalculated });
    if (error) throw error;
    revalidatePath("/admin/importazioni");
    revalidatePath("/campionati");
    revalidatePath("/coppe");
    return { ok: true as const, message: "Calendario eliminato con successo.", result: data };
  } catch (error) {
    return { ok: false as const, message: actionError(error, "Eliminazione non riuscita.") };
  }
}

export async function deleteImportAction(importId: string): Promise<{ ok: boolean; message: string }> {
  try {
    await requireImportAdmin();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId)) return { ok: false, message: "Importazione non valida." };
    const db = getSupabaseAdminClient() as unknown as SupabaseClient;
    const record = await db.from("importazioni").select("id,stato").eq("id", importId).maybeSingle();
    if (record.error || !record.data) return { ok: false, message: "Importazione non trovata." };
    if (!["anteprima", "errore", "annullata"].includes(String(record.data.stato))) return { ok: false, message: "Le importazioni pubblicate non possono essere eliminate: contengono la provenienza di dati competitivi." };
    const [matches, rests] = await Promise.all([
      db.from("partite").select("id", { count: "exact", head: true }).eq("import_batch_id", importId),
      db.from("riposi_competizione").select("id", { count: "exact", head: true }).eq("import_batch_id", importId),
    ]);
    if (matches.error || rests.error) return { ok: false, message: "Impossibile verificare i dati collegati." };
    if ((matches.count ?? 0) > 0 || (rests.count ?? 0) > 0) return { ok: false, message: "Importazione non eliminabile perché collegata a dati competitivi." };
    const removed = await db.from("importazioni").delete().eq("id", importId).in("stato", ["anteprima", "errore", "annullata"]);
    if (removed.error) return { ok: false, message: "Eliminazione non riuscita." };
    revalidatePath("/admin/importazioni");
    return { ok: true, message: "Record di importazione eliminato. Nessuna partita o risultato è stato cancellato." };
  } catch {
    return { ok: false, message: "Eliminazione non autorizzata." };
  }
}
