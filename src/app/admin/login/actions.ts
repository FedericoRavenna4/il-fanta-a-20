"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export type LoginActionState = { message: string };
const genericLoginError = "Credenziali non valide o accesso non autorizzato.";

async function developmentActionLog(action: string, outcome: string) {
  if (process.env.NODE_ENV !== "development") return;
  const referer = (await headers()).get("referer");
  let source = "sconosciuta";
  try { if (referer) source = new URL(referer).pathname; } catch { /* Log diagnostico non critico. */ }
  console.info(`[admin/auth] ${action}`, { source, outcome });
}

export async function verifyAdminLoginAction(_state: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: genericLoginError };

  const supabase = await createAuthenticatedSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  await developmentActionLog("login", error ? "signIn fallito" : "signIn riuscito");
  if (error) return { message: genericLoginError };

  try {
    await requireImportAdmin();
    await developmentActionLog("login", "autorizzazione riuscita; redirect /admin/importazioni");
  } catch {
    await supabase.auth.signOut();
    await developmentActionLog("login", "autorizzazione negata; logout");
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
  await developmentActionLog("logout", "signOut riuscito; redirect /admin/login");
  revalidatePath("/admin/login", "page");
  revalidatePath("/admin/importazioni", "page");
  redirect("/admin/login");
}
