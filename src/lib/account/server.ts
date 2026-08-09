import "server-only";

import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { ACCOUNT_AVATAR_BUCKET, isOwnedAvatarPath } from "./avatar";

export type AccountViewer = { id: string; username: string | null; avatarUrl: string | null };

export async function getCurrentAccount(): Promise<AccountViewer | null> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return { id: user.id, username: null, avatarUrl: null };
    const avatarPath = isOwnedAvatarPath(profile.avatar_url, user.id) ? profile.avatar_url : null;
    const avatarUrl = avatarPath ? supabase.storage.from(ACCOUNT_AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl : null;
    return { id: profile.id, username: profile.username, avatarUrl };
  } catch {
    return null;
  }
}

export function accountRedirectUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configured || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://ilfantaa20.it");
  return new URL(path, base).toString();
}
