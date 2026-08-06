import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSocietaName, parseCalendarBuffer } from "../../../scripts/lib/calendar-import.mjs";
import { sha256 } from "./hash.server";
import { validateImportFile } from "./file-validation";
import type { ImportChange, ImportIssue, ImportPreview, ImportType } from "./types";
import { assertPublishable, compareByLogicalKey, parsePositiveInteger, validateEditionSelection } from "./logic";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function issues(parsed: ReturnType<typeof parseCalendarBuffer>) {
  const errors: ImportIssue[] = [
    ...parsed.diagnostics.unknownNames.map((value) => ({ codice: "SOCIETA_NON_RICONOSCIUTA", messaggio: `Società non riconosciuta: ${value}`, valore: value })),
    ...parsed.diagnostics.ambiguousNames.map((value) => ({ codice: "SOCIETA_AMBIGUA", messaggio: `Società ambigua: ${value}`, valore: value })),
    ...parsed.diagnostics.duplicates.map(() => ({ codice: "PARTITA_DUPLICATA", messaggio: "Partita duplicata nel file." })),
    ...parsed.diagnostics.restDuplicates.map(() => ({ codice: "RIPOSO_DUPLICATO", messaggio: "Riposo duplicato nel file." })),
    ...parsed.diagnostics.incompleteRows.map((row) => ({ codice: "RIGA_INCOMPLETA", messaggio: "Partita con una squadra mancante e senza indicazione di riposo.", riga: row.row })),
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
    admin().from("societa").select("id,nome_ufficiale,nome_personalizzato"),
    admin().from("societa_alias").select("societa_id,alias"),
  ]);
  if (teamError || aliasError) throw new Error("Impossibile caricare società e alias.");
  const values = new Map<string, Array<{ societaId: number; alias: string; source: string }>>();
  const add = (name: string, societaId: number, source: string) => {
    const normalized = normalizeSocietaName(name); const current = values.get(normalized) ?? [];
    if (!current.some((item) => item.societaId === societaId)) current.push({ societaId, alias: name, source });
    values.set(normalized, current);
  };
  (teams ?? []).forEach((team) => add(String(team.nome_personalizzato ?? team.nome_ufficiale), Number(team.id), "societa"));
  (aliases ?? []).forEach((alias) => add(String(alias.alias), Number(alias.societa_id), "alias"));
  return { resolve(name: string) { const normalized = normalizeSocietaName(name); const matches = values.get(normalized) ?? []; return { input: name, normalized, matches, societaId: matches.length === 1 ? matches[0].societaId : null }; } };
}

async function prepare(buffer: Uint8Array, importType: ImportType, editionId: number) {
  const parsed = parseCalendarBuffer(buffer, { resolver: await databaseResolver(), edizioneCompetizioneId: editionId });
  if (importType === "calendario_campionato" && parsed.layout.type !== "campionato") throw new Error("Il file non è compatibile con un calendario di campionato.");
  if (importType === "calendario_coppa" && parsed.layout.type !== "competizione") throw new Error("Il file non è compatibile con un calendario di coppa.");
  const foundIssues = issues(parsed);
  const matchRows = parsed.matches.filter((match) => match.casa.societaId !== null && match.trasferta.societaId !== null).map((match) => ({ edizione_competizione_id: editionId, giornata_lega: match.giornataLega, giornata_serie_a: match.giornataSerieA, societa_casa_id: match.casa.societaId, societa_trasferta_id: match.trasferta.societaId, fantapunti_casa: match.fantapuntiCasa, fantapunti_trasferta: match.fantapuntiTrasferta, gol_casa: match.golCasa, gol_trasferta: match.golTrasferta, stato: match.stato, fonte_importazione: "leghe_fantacalcio" }));
  const restRows = parsed.rests.filter((rest) => rest.societa.societaId !== null).map((rest) => ({ edizione_competizione_id: editionId, giornata_lega: rest.giornataLega, giornata_serie_a: rest.giornataSerieA, societa_id: rest.societa.societaId, fase: rest.fase, girone: rest.girone, raggruppamento: rest.raggruppamento }));
  const [{ data: existingMatches, error: matchError }, { data: existingRests, error: restError }] = await Promise.all([
    admin().from("partite").select("*").eq("edizione_competizione_id", editionId),
    admin().from("riposi_competizione").select("*").eq("edizione_competizione_id", editionId),
  ]);
  if (matchError || restError) throw new Error("Impossibile confrontare i dati esistenti.");
  const matchPlan = compareByLogicalKey(matchRows, existingMatches ?? [], ["edizione_competizione_id", "giornata_lega", "societa_casa_id", "societa_trasferta_id"], ["giornata_serie_a", "fantapunti_casa", "fantapunti_trasferta", "gol_casa", "gol_trasferta", "stato"]);
  const restPlan = compareByLogicalKey(restRows, existingRests ?? [], ["edizione_competizione_id", "giornata_lega", "societa_id"], ["giornata_serie_a", "fase", "girone", "raggruppamento"]);
  return { parsed, ...foundIssues, matchRows, restRows, matchPlan, restPlan };
}

export async function createAuthenticatedPreview(formData: FormData, userId: string): Promise<ImportPreview> {
  const fileValue = formData.get("file");
  const file = validateImportFile(fileValue instanceof File ? fileValue : null);
  const importType = String(formData.get("importType")) as ImportType;
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
  const { data: validEditions, error: editionsError } = await admin().from("edizioni_competizioni").select("id,stagione_id,competizione_id,competizioni!inner(tipo)").eq("stagione_id", seasonId).eq("attiva", true);
  const candidates = (validEditions ?? []).map((edition) => {
    const competition = Array.isArray(edition.competizioni) ? edition.competizioni[0] : edition.competizioni;
    return { edizioneCompetizioneId: edition.id, stagioneId: edition.stagione_id, competizioneId: edition.competizione_id, competitionType: competition?.tipo };
  });
  let editionId: number;
  try {
    if (editionsError) throw new Error("Impossibile verificare le edizioni disponibili.");
    editionId = validateEditionSelection({ seasonId: receivedSeasonId, editionCompetitionId: receivedEditionId, importType }, candidates).editionCompetitionId;
    if (process.env.NODE_ENV === "development") console.info("[admin/importazioni] Selezione anteprima accettata", { stagione_id: seasonId, edizione_competizione_id: editionId, tipo: importType, edizioni_valide: candidates.map((item) => item.edizioneCompetizioneId) });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[admin/importazioni] Selezione anteprima rifiutata", { stagione_id: String(receivedSeasonId), edizione_competizione_id: String(receivedEditionId), tipo: importType, edizioni_valide: candidates.map((item) => item.edizioneCompetizioneId), motivo: error instanceof Error ? error.message : "rifiuto sconosciuto" });
    throw error;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = sha256(bytes);
  const { data: importRow, error: insertError } = await admin().from("importazioni").insert({ tipo: importType, stagione_id: seasonId, edizione_competizione_id: editionId, nome_file: file.name, file_hash: hash, dimensione_file: file.size, stato: "anteprima", importato_da: userId }).select("id").single();
  if (insertError || !importRow) throw new Error("Impossibile creare il record di importazione.");
  let prepared: Awaited<ReturnType<typeof prepare>>;
  try {
    prepared = await prepare(bytes, importType, editionId);
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
  const changes: ImportChange[] = [
    ...parsed.matches.map((match) => ({ kind: "insert" as const, entity: "partita" as const, giornata: match.giornataLega, title: `${match.casa.name} - ${match.trasferta.name}`, detail: [match.stato, `gol: ${match.golCasa ?? "null"}-${match.golTrasferta ?? "null"}`, `fantapunti: ${match.fantapuntiCasa ?? "null"}-${match.fantapuntiTrasferta ?? "null"}`] })),
    ...parsed.rests.map((rest) => ({ kind: "insert" as const, entity: "riposo" as const, giornata: rest.giornataLega, title: `Riposa ${rest.societa.name}`, detail: [rest.fase ?? "Fase non indicata", rest.girone ? `Girone ${rest.girone}` : "Nessun girone"] })),
  ];
  const insert = matchPlan.insert.length + restPlan.insert.length;
  const update = matchPlan.update.length + restPlan.update.length;
  const summary = { giornate: parsed.days.length, partite: parsed.matches.length, riposi: parsed.rests.length, societaRiconosciute: recognized.size, societaNonRiconosciute: parsed.diagnostics.unknownNames, insert, update, unchanged, warning: warnings.length, error: errors.length };
  await admin().from("importazioni").update({ righe_totali: parsed.matches.length + parsed.rests.length, righe_valide: prepared.matchRows.length + prepared.restRows.length, righe_inserite: insert, righe_aggiornate: update, righe_invariate: unchanged, righe_scartate: errors.length, warning_count: warnings.length, error_count: errors.length, riepilogo: summary, warning: warnings, errori: errors }).eq("id", importRow.id);
  return {
    importId: String(importRow.id),
    developmentOnly: false,
    publishEnabled: errors.length === 0,
    fileName: file.name,
    fileHash: hash,
    seasonLabel,
    competitionLabel,
    importType,
    summary,
    changes,
    warnings,
    errors,
  };
}

export async function publishAuthenticatedImport(formData: FormData) {
  const importId = String(formData.get("importId") ?? "");
  const file = validateImportFile(formData.get("file") instanceof File ? formData.get("file") as File : null);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { data: record, error } = await admin().from("importazioni").select("*").eq("id", importId).single();
  if (error || !record) throw new Error("Importazione non trovata.");
  assertPublishable(String(record.stato), Number(record.error_count));
  if (sha256(bytes) !== record.file_hash) throw new Error("Il file non corrisponde all’anteprima validata.");
  const { data: lock } = await admin().from("importazioni").update({ stato: "validata" }).eq("id", importId).eq("stato", "anteprima").select("id").maybeSingle();
  if (!lock) throw new Error("Importazione già in elaborazione o pubblicata.");
  try {
    const prepared = await prepare(bytes, record.tipo as ImportType, Number(record.edizione_competizione_id));
    if (prepared.errors.length) throw new Error("La nuova validazione contiene errori bloccanti.");
    const matchWrites = [...prepared.matchPlan.insert, ...prepared.matchPlan.update].map((row) => ({ ...row, import_batch_id: importId }));
    const restWrites = [...prepared.restPlan.insert, ...prepared.restPlan.update].map((row) => ({ ...row, import_batch_id: importId }));
    if (matchWrites.length) { const { error: writeError } = await admin().from("partite").upsert(matchWrites, { onConflict: "edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id" }); if (writeError) throw writeError; }
    if (restWrites.length) { const { error: writeError } = await admin().from("riposi_competizione").upsert(restWrites, { onConflict: "edizione_competizione_id,giornata_lega,societa_id" }); if (writeError) throw writeError; }
    const inserted = prepared.matchPlan.insert.length + prepared.restPlan.insert.length;
    const updated = prepared.matchPlan.update.length + prepared.restPlan.update.length;
    const unchanged = prepared.matchPlan.unchanged.length + prepared.restPlan.unchanged.length;
    const finalState = prepared.warnings.length ? "pubblicata_con_warning" : "pubblicata";
    await admin().from("importazioni").update({ stato: finalState, completata_il: new Date().toISOString(), righe_inserite: inserted, righe_aggiornate: updated, righe_invariate: unchanged, warning_count: prepared.warnings.length, error_count: 0 }).eq("id", importId);
    return { state: finalState, inserted, updated, unchanged };
  } catch (publishError) {
    await admin().from("importazioni").update({ stato: "errore", completata_il: new Date().toISOString(), error_count: 1, errori: [{ codice: "PUBBLICAZIONE_FALLITA", messaggio: "Pubblicazione non completata." }] }).eq("id", importId);
    throw publishError;
  }
}
