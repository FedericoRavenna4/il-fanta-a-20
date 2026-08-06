import type { ImportHistoryItem } from "./types";

type ImportRow = Record<string, unknown>;
type EditionRow = { id: unknown; nome_edizione?: unknown; competizione_id?: unknown };
type CompetitionRow = { id: unknown; nome?: unknown };

export function assertHistoryQuerySucceeded(error: unknown) {
  if (error) throw new Error("Impossibile caricare lo storico importazioni.");
}

export function buildImportHistory(rows: ImportRow[], editions: EditionRow[], competitions: CompetitionRow[]): ImportHistoryItem[] {
  const editionMap = new Map(editions.map((item) => [String(item.id), item]));
  const competitionMap = new Map(competitions.map((item) => [String(item.id), item]));
  return rows.map((item) => {
    const editionId = item.edizione_competizione_id == null ? null : String(item.edizione_competizione_id);
    const edition = editionId ? editionMap.get(editionId) : undefined;
    const competition = edition?.competizione_id == null ? undefined : competitionMap.get(String(edition.competizione_id));
    return {
      id: String(item.id), createdAt: String(item.created_at), type: String(item.tipo),
      competition: String(competition?.nome ?? edition?.nome_edizione ?? "—"),
      fileName: String(item.nome_file), status: String(item.stato),
      inserted: Number(item.righe_inserite), updated: Number(item.righe_aggiornate),
      warnings: Number(item.warning_count), errors: Number(item.error_count), summary: item.riepilogo,
      warningItems: Array.isArray(item.warning) ? item.warning : [], errorItems: Array.isArray(item.errori) ? item.errori : [],
    };
  });
}
