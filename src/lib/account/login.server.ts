import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { classifyAccountLogin } from "./username";

export async function resolveAccountLoginEmail(identifier: string) {
  const login = classifyAccountLogin(identifier);
  if (login.type === "email") return login.value;
  if (!login.value) return null;
  const admin = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("username_normalizzato", login.value).maybeSingle();
  if (profileError || !profile) return null;
  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user?.email) return null;
  return data.user.email;
}
