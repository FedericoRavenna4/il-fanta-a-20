import "server-only";
import type { AdminAccess } from "./types";
import { evaluateAdminIdentity, normalizeAdminEmail, parseAdminEmailAllowlist } from "./auth-logic";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export function configuredAdminEmails() {
  return parseAdminEmailAllowlist(process.env.ADMIN_IMPORT_EMAILS);
}

export async function getAdminImportAccess(): Promise<AdminAccess> {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { allowed: false, canPublish: false, mode: "denied", email: null, username: "Admin", userId: null, reason: "Sessione admin non autenticata." };
  const email = normalizeAdminEmail(user.email);
  if (evaluateAdminIdentity(email, process.env.ADMIN_IMPORT_EMAILS) !== "authorized") return { allowed: false, canPublish: false, mode: "denied", email: email || null, username: "Admin", userId: user.id, reason: "Accesso non autorizzato." };
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return { allowed: true, canPublish: true, mode: "authenticated", email, username: profile?.username || "Admin", userId: user.id, reason: "Accesso admin verificato." };
}

export async function requireImportAdmin() {
  const access = await getAdminImportAccess();
  if (!access.allowed || !access.email || !access.userId) {
    throw new Error("Accesso admin non autorizzato.");
  }
  return access;
}

export const requireAdminPreviewAccess = requireImportAdmin;
export const requireAdminPublishAccess = requireImportAdmin;
