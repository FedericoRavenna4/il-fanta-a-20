export type SafeBackendError = { name?: string; message?: string; code?: string; status?: number; details?: string; hint?: string };

export function safeBackendError(error: unknown): SafeBackendError {
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  return {
    name: typeof value.name === "string" ? value.name : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    status: typeof value.status === "number" ? value.status : undefined,
    details: typeof value.details === "string" ? value.details : undefined,
    hint: typeof value.hint === "string" ? value.hint : undefined,
  };
}

export function profileCompletionMessage(error: unknown) {
  const value = safeBackendError(error);
  const text = `${value.code ?? ""} ${value.message ?? ""} ${value.details ?? ""}`;
  if (/USERNAME_|profiles_username|duplicate key|23505|profile_already_exists/i.test(text)) return "Username non disponibile o non valido.";
  return "Non è stato possibile completare il profilo. Riprova più tardi.";
}

export type AvatarPersistenceStep = "original-upload" | "crop-upload" | "profile-update" | "complete";
export type AvatarPersistenceResult = { ok: true; step: "complete" } | { ok: false; step: Exclude<AvatarPersistenceStep, "complete">; error: unknown };

export async function persistAvatarFiles(adapter: {
  uploadOriginal?: () => Promise<unknown>;
  uploadCrop: () => Promise<unknown>;
  updateProfile: () => Promise<unknown>;
}): Promise<AvatarPersistenceResult> {
  if (adapter.uploadOriginal) {
    const error = await adapter.uploadOriginal();
    if (error) return { ok: false, step: "original-upload", error };
  }
  const cropError = await adapter.uploadCrop();
  if (cropError) return { ok: false, step: "crop-upload", error: cropError };
  const profileError = await adapter.updateProfile();
  if (profileError) return { ok: false, step: "profile-update", error: profileError };
  return { ok: true, step: "complete" };
}
