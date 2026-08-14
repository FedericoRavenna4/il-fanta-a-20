type CalendarRow = Record<string, unknown> & {
  id?: number;
  edizione_competizione_id: number;
  giornata_lega: number;
  societa_casa_id: number;
  societa_trasferta_id: number;
  stato: string;
};

export function calendarMatchKey(row: CalendarRow) {
  return `${row.edizione_competizione_id}:${row.giornata_lega}:${row.societa_casa_id}:${row.societa_trasferta_id}`;
}

export function planCalendarSynchronization(incomingRows: CalendarRow[], existingRows: CalendarRow[]) {
  const existingByKey = new Map(existingRows.map((row) => [calendarMatchKey(row), row]));
  const safeRows = incomingRows.map((row) => {
    const current = existingByKey.get(calendarMatchKey(row));
    if (row.stato !== "programmata" || !current || current.stato !== "calcolata") return row;
    return {
      ...row,
      fantapunti_casa: current.fantapunti_casa,
      fantapunti_trasferta: current.fantapunti_trasferta,
      gol_casa: current.gol_casa,
      gol_trasferta: current.gol_trasferta,
      stato: current.stato,
    };
  });
  const incomingKeys = new Set(safeRows.map(calendarMatchKey));
  const obsolete = existingRows.filter((row) => !incomingKeys.has(calendarMatchKey(row)));
  return {
    safeRows,
    obsoleteFuture: obsolete.filter((row) => row.stato !== "calcolata"),
    obsoleteCalculated: obsolete.filter((row) => row.stato === "calcolata"),
  };
}

type CalendarDependency = { id: number; partita_id: number };

/**
 * Read-only planner for repairing a calendar that accumulated old fixtures.
 * It never guesses: a dependency is remappable only when the supplied target
 * contains exactly one different row with the same complete logical key.
 */
export function planCalendarReconciliation(targetRows: CalendarRow[], existingRows: CalendarRow[], dependencies: CalendarDependency[]) {
  const existingById = new Map(existingRows.filter((row) => row.id !== undefined).map((row) => [row.id as number, row]));
  const targetsByKey = new Map<string, CalendarRow[]>();
  for (const row of targetRows) {
    const key = calendarMatchKey(row);
    targetsByKey.set(key, [...(targetsByKey.get(key) ?? []), row]);
  }
  const targetIds = new Set(targetRows.flatMap((row) => row.id === undefined ? [] : [row.id]));
  const obsoleteRows = existingRows.filter((row) => row.id !== undefined && !targetIds.has(row.id));
  const remappable: Array<{ dependencyId: number; fromPartitaId: number; toPartitaId: number }> = [];
  const manual: Array<{ dependencyId: number; partitaId: number; reason: "missing_source" | "no_exact_target" | "ambiguous_target" }> = [];

  for (const dependency of dependencies) {
    if (targetIds.has(dependency.partita_id)) continue;
    const source = existingById.get(dependency.partita_id);
    if (!source) { manual.push({ dependencyId: dependency.id, partitaId: dependency.partita_id, reason: "missing_source" }); continue; }
    const candidates = (targetsByKey.get(calendarMatchKey(source)) ?? []).filter((row) => row.id !== undefined && row.id !== source.id);
    if (candidates.length === 1) remappable.push({ dependencyId: dependency.id, fromPartitaId: dependency.partita_id, toPartitaId: candidates[0].id as number });
    else manual.push({ dependencyId: dependency.id, partitaId: dependency.partita_id, reason: candidates.length ? "ambiguous_target" : "no_exact_target" });
  }

  return { targetRows, obsoleteRows, remappable, manual };
}
