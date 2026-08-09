"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export type LoginActionState = { message: string };
const genericLoginError = "Credenziali non valide o accesso non autorizzato.";

export async function verifyAdminLoginAction(_state: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: genericLoginError };

  const supabase = await createAuthenticatedSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: genericLoginError };

  try {
    await requireImportAdmin();
  } catch {
    await supabase.auth.signOut();
    return { message: genericLoginError };
  }

  revalidatePath("/admin/login", "page");
  revalidatePath("/admin/importazioni", "page");
  redirect("/admin/importazioni");
}

export async function logoutAdminAction() {
  const supabase = await createAuthenticatedSupabaseClient();
  await supabase.auth.getUser();
  await supabase.auth.signOut();
  revalidatePath("/admin/login", "page");
  revalidatePath("/admin/importazioni", "page");
  redirect("/admin/login");
}
