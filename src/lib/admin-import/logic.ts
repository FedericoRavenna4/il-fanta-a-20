export type ComparableRow = Record<string, unknown>;

export function compareByLogicalKey(incoming: ComparableRow[], existing: ComparableRow[], keyFields: string[], valueFields: string[]) {
  const key = (row: ComparableRow) => keyFields.map((field) => String(row[field] ?? "")).join(":");
  const current = new Map(existing.map((row) => [key(row), row]));
  return incoming.reduce<{ insert: ComparableRow[]; update: ComparableRow[]; unchanged: ComparableRow[] }>((plan, row) => {
    const previous = current.get(key(row));
    if (!previous) plan.insert.push(row);
    else if (valueFields.some((field) => (previous[field] ?? null) !== (row[field] ?? null))) plan.update.push(row);
    else plan.unchanged.push(row);
    return plan;
  }, { insert: [], update: [], unchanged: [] });
}

export function assertPublishable(state: string, errorCount: number) {
  if (state === "pubblicata" || state === "pubblicata_con_warning") throw new Error("Importazione già pubblicata.");
  if (state !== "anteprima" && state !== "validata") throw new Error("Stato importazione non pubblicabile.");
  if (errorCount > 0) throw new Error("Gli errori bloccanti impediscono la pubblicazione.");
}

export type EditionSelection = { edizioneCompetizioneId: unknown; stagioneId: unknown; competizioneId: unknown; competitionType: unknown };

export function parsePositiveInteger(value: unknown, label: string): number {
  const normalized = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) throw new Error(`${label} non valido.`);
  return normalized;
}

export function validateEditionSelection(input: { seasonId: unknown; editionCompetitionId: unknown; importType: unknown }, editions: EditionSelection[]) {
  const seasonId = parsePositiveInteger(input.seasonId, "Stagione");
  const editionCompetitionId = parsePositiveInteger(input.editionCompetitionId, "Edizione competizione");
  if (input.importType !== "calendario_campionato" && input.importType !== "calendario_coppa") throw new Error("Tipo di importazione non supportato.");
  const edition = editions.find((item) => parsePositiveInteger(item.edizioneCompetizioneId, "Edizione competizione") === editionCompetitionId);
  if (!edition || parsePositiveInteger(edition.stagioneId, "Stagione") !== seasonId) throw new Error("L’edizione selezionata non appartiene alla stagione scelta.");
  const expectedType = edition.competitionType === "campionato" ? "calendario_campionato" : "calendario_coppa";
  if (input.importType !== expectedType) throw new Error(input.importType === "calendario_campionato" ? "La competizione selezionata non è un campionato." : "La competizione selezionata non è una coppa.");
  return { seasonId, editionCompetitionId, competitionId: parsePositiveInteger(edition.competizioneId, "Competizione") };
}
