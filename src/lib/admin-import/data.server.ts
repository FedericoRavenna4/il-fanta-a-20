import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "./auth.server";
import type { AdminCatalog, ImportHistoryItem, ImportType } from "./types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { assertHistoryQuerySucceeded, buildImportHistory } from "./history";

function admin() {
  return getSupabaseAdminClient() as unknown as SupabaseClient;
}

type CatalogError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function logCatalogError(source: string, error: CatalogError | null) {
  if (!error || process.env.NODE_ENV !== "development") return;
  console.error(`[admin/importazioni] Errore caricamento ${source}`, {
    message: error.message ?? "Errore Supabase sconosciuto",
    code: error.code ?? "",
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

export async function getImportAdminCatalog(): Promise<AdminCatalog> {
  await requireImportAdmin();
  const supabase = await createAuthenticatedSupabaseClient() as unknown as SupabaseClient;
  const [{ data: seasons, error: seasonError }, { data: editions, error: editionError }, { data: competitions, error: competitionError }] = await Promise.all([
    supabase.from("stagioni").select("id,codice").order("id", { ascending: false }),
    supabase.from("edizioni_competizioni").select("id,nome_edizione,stagione_id,competizione_id,stato,attiva").eq("attiva", true),
    supabase.from("competizioni").select("id,nome,tipo"),
  ]);
  logCatalogError("stagioni", seasonError);
  logCatalogError("edizioni_competizioni", editionError);
  logCatalogError("competizioni", competitionError);
  if (seasonError || editionError || competitionError) throw new Error("Impossibile caricare il catalogo delle competizioni.");
  const seasonMap = new Map((seasons ?? []).map((item) => [Number(item.id), item]));
  const competitionMap = new Map((competitions ?? []).map((item) => [Number(item.id), item]));
  return {
    seasons: (seasons ?? []).map((item) => ({ id: String(item.id), label: String(item.codice) })),
    competitions: (editions ?? []).flatMap((edition) => {
      const season = seasonMap.get(Number(edition.stagione_id));
      const competition = competitionMap.get(Number(edition.competizione_id));
      if (!season || !competition) return [];
      const importType: ImportType = competition.tipo === "campionato" ? "calendario_campionato" : "calendario_coppa";
      const editionId = String(edition.id);
      return [{
        id: editionId,
        editionId,
        seasonId: String(edition.stagione_id),
        competitionId: String(edition.competizione_id),
        label: `${String(competition.nome)} · ${String(season.codice)}`,
        importType,
      }];
    }),
  };
}

export async function getImportHistory(): Promise<ImportHistoryItem[]> {
  await requireImportAdmin();
  const supabase = admin();
  const { data: imports, error: importError } = await supabase.from("importazioni").select("id,created_at,tipo,edizione_competizione_id,nome_file,stato,righe_inserite,righe_aggiornate,warning_count,error_count,riepilogo,errori,warning").order("created_at", { ascending: false }).limit(20);
  logCatalogError("storico importazioni", importError);
  assertHistoryQuerySucceeded(importError);
  if (!imports?.length) return [];

  const editionIds = [...new Set(imports.map((item) => item.edizione_competizione_id).filter((id) => id != null))];
  const { data: editions, error: editionError } = editionIds.length
    ? await supabase.from("edizioni_competizioni").select("id,nome_edizione,competizione_id").in("id", editionIds)
    : { data: [], error: null };
  logCatalogError("edizioni dello storico", editionError);
  assertHistoryQuerySucceeded(editionError);

  const competitionIds = [...new Set((editions ?? []).map((item) => item.competizione_id).filter((id) => id != null))];
  const { data: competitions, error: competitionError } = competitionIds.length
    ? await supabase.from("competizioni").select("id,nome").in("id", competitionIds)
    : { data: [], error: null };
  logCatalogError("competizioni dello storico", competitionError);
  assertHistoryQuerySucceeded(competitionError);
  return buildImportHistory(imports, editions ?? [], competitions ?? []);
}
