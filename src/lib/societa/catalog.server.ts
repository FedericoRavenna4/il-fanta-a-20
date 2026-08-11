import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import type { CurrentSocieta, CurrentSocietaRow } from "./current.server";
import { mapCurrentSocieta } from "./current.server";

const CURRENT_SOCIETA_COLUMNS =
  "id,nome_ufficiale,nome_personalizzato,nome_normalizzato,slug,fantallenatore,nickname_instagram,squadra_associata,stagione_ingresso,categoria,girone,logo_path,storia,storia_tifo,badge_tipo,attiva" as const;

export type CurrentSocietaSlugLookup = {
  societa: CurrentSocieta;
  requestedSlug: string;
  canonicalSlug: string;
  isAlias: boolean;
};

async function getPublicSocietaClient() {
  noStore();
  return createAuthenticatedSupabaseClient();
}

function throwReadError(context: string, error: { message: string } | null) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function getActiveSocietaCatalog(): Promise<CurrentSocieta[]> {
  const supabase = await getPublicSocietaClient();
  const { data, error } = await supabase
    .from("societa")
    .select(CURRENT_SOCIETA_COLUMNS)
    .eq("attiva", true)
    .order("id", { ascending: true });

  throwReadError("Lettura catalogo società fallita", error);
  return ((data ?? []) as CurrentSocietaRow[]).map(mapCurrentSocieta);
}

export async function getActiveSocietaById(id: number): Promise<CurrentSocieta | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const supabase = await getPublicSocietaClient();
  const { data, error } = await supabase
    .from("societa")
    .select(CURRENT_SOCIETA_COLUMNS)
    .eq("id", id)
    .eq("attiva", true)
    .maybeSingle();

  throwReadError("Lettura società per ID fallita", error);
  return data ? mapCurrentSocieta(data as CurrentSocietaRow) : null;
}

export async function getActiveSocietaBySlug(slug: string): Promise<CurrentSocietaSlugLookup | null> {
  const requestedSlug = slug.trim().toLowerCase();
  if (!requestedSlug) return null;
  const supabase = await getPublicSocietaClient();
  const canonical = await supabase
    .from("societa")
    .select(CURRENT_SOCIETA_COLUMNS)
    .eq("slug", requestedSlug)
    .eq("attiva", true)
    .maybeSingle();

  throwReadError("Lettura società per slug fallita", canonical.error);
  if (canonical.data) {
    const societa = mapCurrentSocieta(canonical.data as CurrentSocietaRow);
    return { societa, requestedSlug, canonicalSlug: societa.slug, isAlias: false };
  }

  const alias = await supabase
    .from("societa_slug_aliases")
    .select("societa_id")
    .eq("slug", requestedSlug)
    .maybeSingle();

  throwReadError("Lettura alias slug società fallita", alias.error);
  if (!alias.data) return null;

  const company = await supabase
    .from("societa")
    .select(CURRENT_SOCIETA_COLUMNS)
    .eq("id", alias.data.societa_id)
    .eq("attiva", true)
    .maybeSingle();

  throwReadError("Lettura società associata allo slug alias fallita", company.error);
  if (!company.data) return null;
  const societa = mapCurrentSocieta(company.data as CurrentSocietaRow);
  return { societa, requestedSlug, canonicalSlug: societa.slug, isAlias: true };
}
