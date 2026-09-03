export type LineupSaveDbError = { code?: string | null; message?: string | null; details?: string | null; hint?: string | null };
export type LineupSaveContext = { seasonId: number; matchday: number; matchId: number; societyIds: number[] };

const DB_ERRORS = {
  FANTABET_LINEUPS_SCOPE_INVALIDO: { category: "SCOPE_INVALID", message: "Stagione o giornata FantaBet non valide." },
  FANTABET_LINEUPS_INVALIDE: { category: "LINEUPS_INVALID", message: "Le due formazioni non rispettano il formato richiesto." },
  FANTABET_TITOLARI_INVALIDI: { category: "PLAYERS_INVALID", message: "Controlla che ogni formazione abbia 11 titolari validi della rosa corretta." },
  FANTABET_LINEUPS_FORMATO_AMBIGUO: { category: "PAYLOAD_FORMAT", message: "Il formato delle formazioni non è valido." },
  FANTABET_LINEUPS_LEGA_INVALIDA: { category: "LEAGUE_INVALID", message: "Non è possibile determinare in modo sicuro la lega della formazione." },
  FANTABET_LINEUPS_PARTITA_FUORI_SCOPE: { category: "MATCH_OUT_OF_SCOPE", message: "La partita non appartiene alla stagione e giornata FantaBet selezionate." },
  FANTABET_LINEUPS_PARTITA_NON_SELEZIONATA: { category: "MATCH_NOT_SELECTED", message: "La partita non appartiene alle cinque giocate della round FantaBet." },
} as const;

export function mapLineupSaveError(error: LineupSaveDbError | null) {
  const source = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  const key = (Object.keys(DB_ERRORS) as Array<keyof typeof DB_ERRORS>).find((candidate) => source.includes(candidate));
  return key ? DB_ERRORS[key] : { category: "DB_UNKNOWN", message: "Salvataggio rifiutato. Le formazioni precedenti sono rimaste invariate." };
}

export function reportLineupSaveFailure(error: LineupSaveDbError | null, context: LineupSaveContext) {
  const mapped = error ? mapLineupSaveError(error) : { category: "RPC_FALSE_RESULT", message: "Salvataggio rifiutato. Le formazioni precedenti sono rimaste invariate." };
  console.error("[fantabet-lineups:save]", { code: error?.code ?? null, message: error?.message ?? null, details: error?.details ?? null, hint: error?.hint ?? null, category: mapped.category, stagione: context.seasonId, giornata: context.matchday, matchId: context.matchId, societa_ids: [...context.societyIds] });
  return mapped.message;
}

export function resolveLineupSaveFailure(data: unknown, error: LineupSaveDbError | null, context: LineupSaveContext) {
  return !error && data === true ? null : reportLineupSaveFailure(error, context);
}
