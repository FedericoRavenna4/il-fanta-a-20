"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { accountRedirectUrl } from "@/lib/account/server";
import { validateAccountUsername } from "@/lib/account/username";

export type AccountActionState = { message: string; field?: "email" | "password" | "username"; success?: boolean };
const GENERIC_AUTH_ERROR = "Non è stato possibile completare l’operazione. Controlla i dati e riprova.";

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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: "Inserisci email e password." };
  const supabase = await createAuthenticatedSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Credenziali non valide oppure email non ancora verificata." };
  revalidatePath("/", "layout");
  redirect("/account");
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
