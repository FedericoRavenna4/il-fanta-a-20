"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { accountRedirectUrl } from "@/lib/account/server";
import { validateAccountUsername } from "@/lib/account/username";
import { ACCOUNT_AVATAR_BUCKET, ACCOUNT_AVATAR_ORIGINAL_BUCKET, isOwnedAvatarOriginalPath, isOwnedAvatarPath, validateAccountAvatar } from "@/lib/account/avatar";
import { resolveAccountLoginEmail } from "@/lib/account/login.server";
import { safeAccountReturnUrl } from "@/lib/account/return-url";
import { persistAvatarFiles, profileCompletionMessage, safeBackendError } from "@/lib/account/persistence";

export type AccountActionState = { message: string; field?: "email" | "password" | "username"; success?: boolean };
const GENERIC_AUTH_ERROR = "Non è stato possibile completare l’operazione. Controlla i dati e riprova.";
export type AvatarActionState = { message: string; success?: boolean };
export type CompleteProfileState = { message: string; success?: boolean };

export async function completeLegacyProfileAction(_state: CompleteProfileState, formData: FormData): Promise<CompleteProfileState> {
  const validation = validateAccountUsername(String(formData.get("username") ?? ""));
  if (!validation.ok) return { message: validation.message };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { message: "Sessione non valida. Accedi nuovamente." };
  const { data, error } = await supabase.rpc("create_my_legacy_profile", { p_username: validation.username });
  if (error || !data?.username) {
    console.error("[account/profile-completion] failed", safeBackendError(error));
    return { message: profileCompletionMessage(error) };
  }
  revalidatePath("/", "layout");
  redirect(`/user/${encodeURIComponent(data.username)}`);
}

export async function uploadAvatarAction(_state: AvatarActionState, formData: FormData): Promise<AvatarActionState> {
  const file = formData.get("avatar");
  const original = formData.get("original");
  if (!(file instanceof File)) return { message: "Seleziona un’immagine." };
  const validation = await validateAccountAvatar(file);
  if (!validation.ok) return { message: validation.message };
  const originalValidation = original instanceof File ? await validateAccountAvatar(original) : null;
  if (originalValidation && !originalValidation.ok) return { message: originalValidation.message };

  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { message: "Sessione non valida. Accedi nuovamente." };
  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (!profile) return { message: "Il profilo pubblico non è configurato." };

  let originalPath: string | null = null;
  if (original instanceof File && originalValidation?.ok) {
    originalPath = `${user.id}/original.${originalValidation.extension}`;
  } else {
    const { data: originalObjects, error: originalListError } = await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).list(user.id, { search: "original." });
    if (originalListError) console.error("[account/avatar-original] lookup failed", safeBackendError(originalListError));
    if (!(originalObjects ?? []).some((item) => /^original\.(jpg|png|webp)$/.test(item.name))) return { message: "Per ritagliare di nuovo questo avatar, scegli nuovamente l’immagine." };
  }

  const path = `${user.id}/avatar.${validation.extension}`;
  const persistence = await persistAvatarFiles({
    uploadOriginal: originalPath && original instanceof File && originalValidation?.ok ? async () => (await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).upload(originalPath!, original, { contentType: originalValidation.contentType, cacheControl: "0", upsert: true })).error : undefined,
    uploadCrop: async () => (await supabase.storage.from(ACCOUNT_AVATAR_BUCKET).upload(path, file, { contentType: validation.contentType, cacheControl: "0", upsert: true })).error,
    updateProfile: async () => (await supabase.rpc("set_my_avatar_path", { p_avatar_path: path })).error,
  });
  if (!persistence.ok) {
    console.error(`[account/avatar-${persistence.step}] failed`, safeBackendError(persistence.error));
    if (persistence.step === "profile-update" && profile.avatar_url !== path) {
      const { error: rollbackError } = await supabase.storage.from(ACCOUNT_AVATAR_BUCKET).remove([path]);
      if (rollbackError) console.error("[account/avatar-crop] rollback failed", safeBackendError(rollbackError));
    }
    return { message: persistence.step === "profile-update" ? "Avatar caricato, ma il profilo non è stato aggiornato." : "Non è stato possibile salvare l’immagine. Riprova più tardi." };
  }

  if (originalPath) {
    const { data: originalObjects, error: originalListError } = await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).list(user.id, { search: "original." });
    if (originalListError) console.error("[account/avatar-original] cleanup list failed", safeBackendError(originalListError));
    const obsolete = (originalObjects ?? []).map((item) => `${user.id}/${item.name}`).filter((item) => item !== originalPath);
    if (obsolete.length) {
      const { error: cleanupError } = await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).remove(obsolete);
      if (cleanupError) console.error("[account/avatar-original] cleanup failed", safeBackendError(cleanupError));
    }
  }

  if (isOwnedAvatarPath(profile.avatar_url, user.id) && profile.avatar_url !== path) {
    const { error: cleanupError } = await supabase.storage.from(ACCOUNT_AVATAR_BUCKET).remove([profile.avatar_url!]);
    if (cleanupError) console.error("[account/avatar-crop] cleanup failed", safeBackendError(cleanupError));
  }
  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/user/[username]", "page");
  return { success: true, message: "Avatar aggiornato." };
}

export async function getMyAvatarOriginalAction(): Promise<{ url: string | null; message?: string }> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { url: null, message: "Sessione non valida. Accedi nuovamente." };
  const { data: objects, error: listError } = await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).list(user.id, { search: "original." });
  if (listError) return { url: null, message: "L'originale non è ancora disponibile. Usa Cambia immagine." };
  const path = (objects ?? []).map((item) => `${user.id}/${item.name}`).find((item) => isOwnedAvatarOriginalPath(item, user.id));
  if (!path) return { url: null, message: "L'originale non è disponibile per questo avatar. Usa Cambia immagine per sceglierlo nuovamente." };
  const { data, error } = await supabase.storage.from(ACCOUNT_AVATAR_ORIGINAL_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return { url: null, message: "Non è stato possibile aprire l'immagine originale." };
  return { url: data.signedUrl };
}

export async function signUpAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const validation = validateAccountUsername(String(formData.get("username") ?? ""));
  if (!validation.ok) return { message: validation.message, field: "username" };
  if (!email || !password || password.length < 8) return { message: "Inserisci un’email valida e una password di almeno 8 caratteri." };

  const supabase = await createAuthenticatedSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: validation.username },
      emailRedirectTo: accountRedirectUrl("/account/callback?next=/account"),
    },
  });
  if (error) {
    if (/username_(non_valido|riservato)|profiles_username|duplicate key/i.test(error.message)) {
      return { message: "Username non disponibile o non valido.", field: "username" };
    }
    return { message: GENERIC_AUTH_ERROR };
  }
  redirect("/account/verifica-email");
}

export async function loginAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeAccountReturnUrl(formData.get("returnTo"), "");
  if (!identifier || !password) return { message: "Credenziali non valide." };
  const email = await resolveAccountLoginEmail(identifier);
  if (!email) return { message: "Credenziali non valide." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: login, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Credenziali non valide." };
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", login.user.id).maybeSingle();
  revalidatePath("/", "layout");
  redirect(returnTo || (profile?.username ? `/user/${encodeURIComponent(profile.username)}` : "/account"));
}

export async function logoutAction() {
  const supabase = await createAuthenticatedSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { message: "Inserisci la tua email.", field: "email" };
  const supabase = await createAuthenticatedSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: accountRedirectUrl("/account/callback?next=/account/reset-password") });
  return { success: true, message: "Se esiste un account associato, riceverai un’email con le istruzioni." };
}

export async function resetPasswordAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 8) return { message: "La password deve contenere almeno 8 caratteri.", field: "password" };
  if (password !== confirmation) return { message: "Le password non coincidono.", field: "password" };
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Il link non è valido o è scaduto. Richiedine uno nuovo." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: GENERIC_AUTH_ERROR };
  revalidatePath("/", "layout");
  return { success: true, message: "Password aggiornata. Ora puoi continuare con il tuo account." };
}
