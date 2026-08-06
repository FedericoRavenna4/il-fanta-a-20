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
  if (error || !user) return { allowed: false, canPublish: false, mode: "denied", email: null, userId: null, reason: "Sessione admin non autenticata." };
  const email = normalizeAdminEmail(user.email);
  if (evaluateAdminIdentity(email, process.env.ADMIN_IMPORT_EMAILS) !== "authorized") return { allowed: false, canPublish: false, mode: "denied", email: email || null, userId: user.id, reason: "Accesso non autorizzato." };
  return { allowed: true, canPublish: true, mode: "authenticated", email, userId: user.id, reason: "Accesso admin verificato." };
}

export async function requireImportAdmin() {
  const access = await getAdminImportAccess();
  if (!access.allowed || !access.email || !access.userId) {
    if (access.userId) {
      const supabase = await createAuthenticatedSupabaseClient();
      await supabase.auth.signOut();
    }
    throw new Error("Accesso admin non autorizzato.");
  }
  return access;
}

export const requireAdminPreviewAccess = requireImportAdmin;
export const requireAdminPublishAccess = requireImportAdmin;
