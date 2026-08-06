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
