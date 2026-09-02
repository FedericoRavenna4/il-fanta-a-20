import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSocietaName, parseCalendarBuffer, validateCampionatoCalendarStructure, validateCoppaCalendarStructure } from "../../../scripts/lib/calendar-import.mjs";
import { sha256 } from "./hash.server";
import { validateImportFile } from "./file-validation";
import type { ImportChange, ImportIssue, ImportPreview, ImportType } from "./types";
import { compareByLogicalKey, parsePositiveInteger, validateEditionSelection } from "./logic";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { planCalendarSynchronization } from "./calendar-sync";
import { getCompetitionImportConfig } from "./competition-config";

type CalendarImportType = Exclude<ImportType, "rose">;
type ResultAnomaly = { type: "risultato_parziale_o_ambiguo"; row?: number; giornataLega?: number; casa?: string | null; trasferta?: string | null; motivo?: string };

function isResultAnomaly(item: unknown): item is ResultAnomaly {
  return Boolean(item && typeof item === "object" && "type" in item && item.type === "risultato_parziale_o_ambiguo");
}

function issues(parsed: ReturnType<typeof parseCalendarBuffer>, importType: CalendarImportType, competitionCode: string) {
  const competitionConfig = getCompetitionImportConfig(competitionCode);
  const resultAnomalies = parsed.diagnostics.anomalies.filter(isResultAnomaly);
  const errors: ImportIssue[] = [
    ...parsed.diagnostics.unknownNames.map((value) => ({ codice: "SOCIETA_NON_RICONOSCIUTA", messaggio: `Società non riconosciuta: ${value}`, valore: value })),
    ...parsed.diagnostics.ambiguousNames.map((value) => ({ codice: "SOCIETA_AMBIGUA", messaggio: `Società ambigua: ${value}`, valore: value })),
    ...parsed.diagnostics.duplicates.map(() => ({ codice: "PARTITA_DUPLICATA", messaggio: "Partita duplicata nel file." })),
    ...parsed.diagnostics.restDuplicates.map(() => ({ codice: "RIPOSO_DUPLICATO", messaggio: "Riposo duplicato nel file." })),
    ...parsed.diagnostics.incompleteRows.map((row) => ({ codice: "RIGA_INCOMPLETA", messaggio: "Partita con una squadra mancante e senza indicazione di riposo.", riga: row.row })),
    ...resultAnomalies.map((item) => ({
      codice: "RISULTATO_PARZIALE_O_AMBIGUO",
      messaggio: `Giornata ${item.giornataLega}, ${item.casa ?? "squadra casa"} - ${item.trasferta ?? "squadra trasferta"}: ${item.motivo ?? "risultato o fantapunteggi incompleti"}.`,
      riga: item.row,
    })),
    ...(importType === "calendario_campionato" ? validateCampionatoCalendarStructure(parsed) : []),
    ...(importType === "calendario_coppa" && competitionConfig?.code === "coppa-fanta-20" ? validateCoppaCalendarStructure(parsed) : []),
  ];
  const warnings: ImportIssue[] = [
    ...parsed.rests.map((rest) => ({ codice: "RIPOSO", messaggio: `Riposo: ${rest.societa.name}`, riga: rest.source.row })),
    ...parsed.diagnostics.uninterpretableValues.map((value) => ({ codice: "VALORE_ACCESSORIO_NON_INTERPRETATO", messaggio: `Raggruppamento conservato senza interpretazione: ${value}`, valore: value })),
  ];
  if (parsed.matches.some((match) => match.stato === "programmata")) warnings.push({ codice: "GIORNATE_FUTURE", messaggio: "Il file contiene partite future senza risultato." });
  return { errors, warnings };
}

function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }

async function databaseResolver() {
  const [{ data: teams, error: teamError }, { data: aliases, error: aliasError }] = await Promise.all([
    admin().from("societa").select("id,nome_ufficiale,nome_personalizzato").eq("attiva", true),
    admin().from("societa_alias").select("societa_id,alias"),
  ]);
  if (teamError || aliasError) throw new Error("Impossibile caricare società e alias.");
  const activeIds = new Set((teams ?? []).map((team) => Number(team.id)));
  const values = new Map<string, Array<{ societaId: number; alias: string; source: string }>>();
  const add = (name: string, societaId: number, source: string) => {
    if (!activeIds.has(societaId)) return;
    const normalized = normalizeSocietaName(name); const current = values.get(normalized) ?? [];
    if (!current.some((item) => item.societaId === societaId)) current.push({ societaId, alias: name, source });
    values.set(normalized, current);
  };
  (teams ?? []).forEach((team) => add(String(team.nome_personalizzato ?? team.nome_ufficiale), Number(team.id), "societa"));
  (aliases ?? []).forEach((alias) => add(String(alias.alias), Number(alias.societa_id), "alias"));
  return { resolve(name: string) { const normalized = normalizeSocietaName(name); const matches = values.get(normalized) ?? []; return { input: name, normalized, matches, societaId: matches.length === 1 ? matches[0].societaId : null }; } };
}

async function prepare(buffer: Uint8Array, importType: CalendarImportType, editionId: number, competitionCode: string) {
  const parsed = parseCalendarBuffer(buffer, { resolver: await databaseResolver(), edizioneCompetizioneId: editionId, calendarType: importType });
  if (importType === "calendario_campionato" && parsed.layout.type !== "campionato") throw new Error("Il file non è compatibile con un calendario di campionato.");
  if (importType === "calendario_coppa" && parsed.layout.type !== "competizione") throw new Error("Il file non è compatibile con un calendario di coppa.");
  const foundIssues = issues(parsed, importType, competitionCode);
  const matchRows = parsed.matches.filter((match) => match.casa.societaId !== null && match.trasferta.societaId !== null).map((match) => ({ edizione_competizione_id: editionId, giornata_lega: match.giornataLega, giornata_serie_a: match.giornataSerieA, societa_casa_id: match.casa.societaId!, societa_trasferta_id: match.trasferta.societaId!, fantapunti_casa: match.fantapuntiCasa, fantapunti_trasferta: match.fantapuntiTrasferta, gol_casa: match.golCasa, gol_trasferta: match.golTrasferta, stato: match.stato, fonte_importazione: "leghe_fantacalcio" }));
  const restRows = parsed.rests.filter((rest) => rest.societa.societaId !== null).map((rest) => ({ edizione_competizione_id: editionId, giornata_lega: rest.giornataLega, giornata_serie_a: rest.giornataSerieA, societa_id: rest.societa.societaId, fase: rest.fase, girone: rest.girone, raggruppamento: rest.raggruppamento }));
  const { data: snapshot, error: snapshotError } = await admin().rpc("admin_calendar_preview_state", { p_edizione_competizione_id: editionId });
  if (snapshotError || !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("Impossibile confrontare i dati esistenti.");
  const previewState = snapshot as Record<string, unknown>;
  const existingMatches = Array.isArray(previewState.matches) ? previewState.matches : [];
  const existingRests = Array.isArray(previewState.rests) ? previewState.rests : [];
  const calendarRevision = Number(previewState.calendarRevision);
  if (!Number.isSafeInteger(calendarRevision) || calendarRevision < 0) throw new Error("Revisione calendario non valida.");
  const synchronization = planCalendarSynchronization(matchRows, existingMatches ?? []);
  const safeMatchRows = synchronization.safeRows;
  const { obsoleteCalculated, obsoleteFuture } = synchronization;
  if ((existingMatches ?? []).length) foundIssues.warnings.push({ codice: "CALENDARIO_ESISTENTE", messaggio: "Esiste già un calendario per questa competizione. La pubblicazione sincronizzerà i record esistenti senza duplicarli e preserverà i risultati calcolati." });
  if (obsoleteFuture.length) foundIssues.warnings.push({ codice: "PARTITE_FUTURE_DA_SOSTITUIRE", messaggio: `${obsoleteFuture.length} partite future non più presenti nel file verranno sostituite durante la sincronizzazione.` });
  if (obsoleteCalculated.length) foundIssues.errors.push({ codice: "CALENDARIO_DIVERGENTE_CALCOLATO", messaggio: `La pubblicazione è bloccata: ${obsoleteCalculated.length} partite già calcolate non corrispondono al nuovo calendario.` });
  const obsoleteIds = obsoleteFuture.flatMap((row) => row.id === undefined ? [] : [row.id]);
  if (obsoleteIds.length) {
    const [{ data: bets, error: betsError }, { data: supportEvents, error: supportError }] = await Promise.all([
      admin().from("fantabet_bets").select("id,partita_id,bet_type").in("partita_id", obsoleteIds),
      admin().from("fantabet_support_match_events").select("id,partita_id").in("partita_id", obsoleteIds),
    ]);
    if (betsError || supportError) throw new Error("Impossibile verificare le dipendenze delle partite rimosse dal nuovo calendario.");
    const dependencies = new Map<number, string[]>();
    for (const bet of bets ?? []) dependencies.set(Number(bet.partita_id), [...(dependencies.get(Number(bet.partita_id)) ?? []), `FantaBet ${String(bet.bet_type)}`]);
    for (const event of supportEvents ?? []) dependencies.set(Number(event.partita_id), [...(dependencies.get(Number(event.partita_id)) ?? []), "Punti Tifo"]);
    for (const row of obsoleteFuture) {
      const linked = row.id === undefined ? undefined : dependencies.get(row.id);
      if (!linked?.length) continue;
      foundIssues.errors.push({ codice: "PARTITA_OBSOLETA_CON_DIPENDENZE", messaggio: `La sincronizzazione non può rimuovere la partita della giornata ${row.giornata_lega}, società ${row.societa_casa_id} - ${row.societa_trasferta_id}: ${linked.join(", ")}.` });
    }
  }
  const matchPlan = compareByLogicalKey(safeMatchRows, existingMatches ?? [], ["edizione_competizione_id", "giornata_lega", "societa_casa_id", "societa_trasferta_id"], ["giornata_serie_a", "fantapunti_casa", "fantapunti_trasferta", "gol_casa", "gol_trasferta", "stato"]);
  const restPlan = compareByLogicalKey(restRows, existingRests ?? [], ["edizione_competizione_id", "giornata_lega", "societa_id"], ["giornata_serie_a", "fase", "girone", "raggruppamento"]);
  const obsoleteRests = existingRests.filter((current) => !restRows.some((incoming) => incoming.edizione_competizione_id === Number((current as Record<string, unknown>).edizione_competizione_id) && incoming.giornata_lega === Number((current as Record<string, unknown>).giornata_lega) && incoming.societa_id === Number((current as Record<string, unknown>).societa_id)));
  return { parsed, ...foundIssues, matchRows: safeMatchRows, restRows, matchPlan, restPlan, obsoleteFuture, obsoleteRests, calendarRevision };
}

export async function createAuthenticatedPreview(formData: FormData, userId: string): Promise<ImportPreview> {
  const fileValue = formData.get("file");
  const file = validateImportFile(fileValue instanceof File ? fileValue : null);
  const importType = String(formData.get("importType")) as CalendarImportType;
  if (importType !== "calendario_campionato" && importType !== "calendario_coppa") throw new Error("Tipo di importazione non supportato.");
  const receivedSeasonId = formData.get("seasonId");
  const receivedEditionId = formData.get("editionCompetitionId");
  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim();
  const competitionLabel = String(formData.get("competitionLabel") ?? "").trim();
  if (!seasonLabel || !competitionLabel) throw new Error("Seleziona stagione e competizione.");
  let seasonId: number;
  try {
    seasonId = parsePositiveInteger(receivedSeasonId, "Stagione");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[admin/importazioni] Selezione anteprima rifiutata", { stagione_id: String(receivedSeasonId), edizione_competizione_id: String(receivedEditionId), tipo: importType, edizioni_valide: [], motivo: error instanceof Error ? error.message : "stagione non valida" });
    throw error;
  }
  const { data: validEditions, error: editionsError } = await admin().from("edizioni_competizioni").select("id,stagione_id,competizione_id,competizioni!inner(tipo,codice)").eq("stagione_id", seasonId).eq("attiva", true);
  const candidates = (validEditions ?? []).map((edition) => {
    const competition = Array.isArray(edition.competizioni) ? edition.competizioni[0] : edition.competizioni;
    return { edizioneCompetizioneId: edition.id, stagioneId: edition.stagione_id, competizioneId: edition.competizione_id, competitionType: competition?.tipo, competitionCode: String(competition?.codice ?? "") };
  });
  let editionId: number;
  try {
    if (editionsError) throw new Error("Impossibile verificare le edizioni disponibili.");
    editionId = validateEditionSelection({ seasonId: receivedSeasonId, editionCompetitionId: receivedEditionId, importType }, candidates).editionCompetitionId;
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[admin/importazioni] Selezione anteprima rifiutata", { stagione_id: String(receivedSeasonId), edizione_competizione_id: String(receivedEditionId), tipo: importType, edizioni_valide: candidates.map((item) => item.edizioneCompetizioneId), motivo: error instanceof Error ? error.message : "rifiuto sconosciuto" });
    throw error;
  }
  const competitionCode = String(candidates.find((item) => Number(item.edizioneCompetizioneId) === editionId)?.competitionCode ?? "");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = sha256(bytes);
  const { data: importRow, error: insertError } = await admin().from("importazioni").insert({ tipo: importType, stagione_id: seasonId, edizione_competizione_id: editionId, nome_file: file.name, file_hash: hash, dimensione_file: file.size, stato: "anteprima", importato_da: userId }).select("id").single();
  if (insertError || !importRow) throw new Error("Impossibile creare il record di importazione.");
  let prepared: Awaited<ReturnType<typeof prepare>>;
  try {
    prepared = await prepare(bytes, importType, editionId, competitionCode);
  } catch (error) {
    await admin().from("importazioni").update({ stato: "errore", completata_il: new Date().toISOString(), error_count: 1, errori: [{ codice: "FORMATO_NON_VALIDO", messaggio: error instanceof Error ? error.message : "Formato non valido" }] }).eq("id", importRow.id);
    throw error;
  }
  const { parsed, errors, warnings, matchPlan, restPlan } = prepared;
  const unchanged = matchPlan.unchanged.length + restPlan.unchanged.length;
  if (unchanged) warnings.push({ codice: "DATI_INVARIATI", messaggio: `${unchanged} record sono già presenti e identici.` });
  const { count: duplicateCount } = await admin().from("importazioni").select("id", { count: "exact", head: true }).eq("file_hash", hash).neq("id", importRow.id);
  if (duplicateCount) warnings.push({ codice: "FILE_GIA_ANALIZZATO", messaggio: "Un file con lo stesso hash è già stato analizzato." });
  const recognized = new Set([...parsed.matches.flatMap((match) => [match.casa, match.trasferta]), ...parsed.rests.map((rest) => rest.societa)].filter((team) => team.societaId !== null).map((team) => team.societaId));
  const matchKind = new Map([...matchPlan.insert.map((row) => [row, "insert"] as const), ...matchPlan.update.map((row) => [row, "update"] as const), ...matchPlan.unchanged.map((row) => [row, "unchanged"] as const)]);
  const restKind = new Map([...restPlan.insert.map((row) => [row, "insert"] as const), ...restPlan.update.map((row) => [row, "update"] as const), ...restPlan.unchanged.map((row) => [row, "unchanged"] as const)]);
  const changes: ImportChange[] = [
    ...prepared.matchRows.map((row) => ({ kind: matchKind.get(row) ?? "unchanged", entity: "partita" as const, giornata: row.giornata_lega, title: `SocietÃ  ${row.societa_casa_id} - ${row.societa_trasferta_id}`, detail: [row.stato, `gol: ${row.gol_casa ?? "null"}-${row.gol_trasferta ?? "null"}`, `fantapunti: ${row.fantapunti_casa ?? "null"}-${row.fantapunti_trasferta ?? "null"}`] })),
    ...prepared.restRows.map((row) => ({ kind: restKind.get(row) ?? "unchanged", entity: "riposo" as const, giornata: row.giornata_lega, title: `Riposa societÃ  ${row.societa_id}`, detail: [row.fase ?? "Fase non indicata", row.girone ? `Girone ${row.girone}` : "Nessun girone"] })),
    ...prepared.obsoleteFuture.map((row) => ({ kind: "remove" as const, entity: "partita" as const, giornata: row.giornata_lega, title: `Rimuovi societÃ  ${row.societa_casa_id} - ${row.societa_trasferta_id}`, detail: ["Partita futura assente dallo snapshot"] })),
    ...prepared.obsoleteRests.map((row) => ({ kind: "remove" as const, entity: "riposo" as const, giornata: Number((row as Record<string, unknown>).giornata_lega), title: `Rimuovi riposo societÃ  ${String((row as Record<string, unknown>).societa_id)}`, detail: ["Riposo assente dallo snapshot"] })),
  ];
  const insert = matchPlan.insert.length + restPlan.insert.length;
  const update = matchPlan.update.length + restPlan.update.length;
  const removed = prepared.obsoleteFuture.length + prepared.obsoleteRests.length;
  const summary = { giornate: parsed.days.length, partite: parsed.matches.length, riposi: parsed.rests.length, societaRiconosciute: recognized.size, societaNonRiconosciute: parsed.diagnostics.unknownNames, insert, update, removed, unchanged, existing: prepared.matchRows.length - matchPlan.insert.length, replace: prepared.obsoleteFuture.length, warning: warnings.length, error: errors.length, calendarRevision: prepared.calendarRevision };
  await admin().from("importazioni").update({ righe_totali: parsed.matches.length + parsed.rests.length, righe_valide: prepared.matchRows.length + prepared.restRows.length, righe_inserite: insert, righe_aggiornate: update, righe_invariate: unchanged, righe_scartate: errors.length, warning_count: warnings.length, error_count: errors.length, riepilogo: summary, warning: warnings, errori: errors }).eq("id", importRow.id);
  return {
    importId: String(importRow.id),
    developmentOnly: false,
    publishEnabled: errors.length === 0,
    fileName: file.name,
    fileHash: hash,
    seasonLabel,
    competitionLabel,
    competitionCode,
    importType,
    summary,
    changes,
    warnings,
    errors,
  };
}

export async function publishAuthenticatedImport(formData: FormData, adminUserId: string) {
  const importId = String(formData.get("importId") ?? "");
  const file = validateImportFile(formData.get("file") instanceof File ? formData.get("file") as File : null);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { data: record, error } = await admin().from("importazioni").select("*").eq("id", importId).single();
  if (error || !record) throw new Error("Importazione non trovata.");
  if (!["anteprima", "pubblicata", "pubblicata_con_warning"].includes(String(record.stato)) || Number(record.error_count) > 0) throw new Error("CALENDAR_IMPORT_NOT_PUBLISHABLE");
  if (sha256(bytes) !== record.file_hash) throw new Error("Il file non corrisponde all’anteprima validata.");
  {
    const edition = await admin().from("edizioni_competizioni").select("competizioni!inner(codice)").eq("id", record.edizione_competizione_id).single();
    if (edition.error || !edition.data) throw new Error("Impossibile identificare la competizione dell’importazione.");
    const competition = Array.isArray(edition.data.competizioni) ? edition.data.competizioni[0] : edition.data.competizioni;
    const prepared = await prepare(bytes, record.tipo as CalendarImportType, Number(record.edizione_competizione_id), String(competition?.codice ?? ""));
    if (prepared.errors.length) throw new Error("La nuova validazione contiene errori bloccanti.");
    const summary = record.riepilogo as Record<string, unknown>;
    const expectedRevision = Number(summary.calendarRevision);
    if (!Number.isSafeInteger(expectedRevision)) throw new Error("CALENDAR_SNAPSHOT_STALE");
    const { data, error: publishError } = await admin().rpc("admin_publish_calendar_snapshot", { p_import_id: importId, p_admin_id: adminUserId, p_expected_revision: expectedRevision, p_matches: prepared.matchRows, p_rests: prepared.restRows });
    if (publishError) throw publishError;
    const result = Array.isArray(data) ? data[0] : data;
    return { state: String(result?.import_state ?? "pubblicata"), inserted: Number(result?.inserted ?? 0), updated: Number(result?.updated ?? 0), removed: Number(result?.removed ?? 0), unchanged: Number(result?.unchanged ?? 0), alreadyPublished: Boolean(result?.already_published) };
  }
}
