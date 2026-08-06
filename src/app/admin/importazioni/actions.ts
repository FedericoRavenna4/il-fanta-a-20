"use server";

import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { createAuthenticatedPreview, publishAuthenticatedImport } from "@/lib/admin-import/preview.server";
import type { ActionResult } from "@/lib/admin-import/types";

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
    return { ok: false, message: error instanceof Error ? error.message : "Pubblicazione non autorizzata." };
  }
}
