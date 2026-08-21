import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSocietaName } from "../../../scripts/lib/calendar-import.mjs";
import { getRisultati } from "@/lib/risultati";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { validateImportFile } from "./file-validation";
import { sha256 } from "./hash.server";
import { diffRoseSnapshot, parseRoseBuffer, type ExistingRoseRow } from "./rose-parser";
import type { ImportChange, ImportPreview } from "./types";

const admin = () => getSupabaseAdminClient() as unknown as SupabaseClient;

const leagueCodes = new Map([
  ["Serie A", "serie-a"],
  ["Serie B", "serie-b"],
  ["Serie C - Girone A", "serie-c-girone-a"],
  ["Serie C - Girone B", "serie-c-girone-b"],
  ["Serie C - Girone C", "serie-c-girone-c"],
]);

function currentLeagueCode(category: unknown, group: unknown) {
  const categoria = String(category ?? "").trim();
  const girone = String(group ?? "").trim().toUpperCase();
  if (categoria === "Serie A") return "serie-a";
  if (categoria === "Serie B") return "serie-b";
  if (categoria === "Serie C" && ["A", "B", "C"].includes(girone)) return `serie-c-girone-${girone.toLowerCase()}`;
  return null;
}

async function resolver(seasonCode: string, activeSeason: boolean) {
  const [{ data: teams, error: teamError }, { data: aliases, error: aliasError }] = await Promise.all([
    admin().from("societa").select("id,nome_ufficiale,nome_personalizzato,categoria,girone"),
    admin().from("societa_alias").select("societa_id,alias"),
  ]);
  if (teamError || aliasError) throw new Error("Impossibile caricare società e alias.");
  const names = new Map<string, Set<number>>();
  const validIds = new Set<number>();
  const historicalLeagueByTeam = new Map<number, string>();
  for (const result of getRisultati()) {
    if (result.stagione !== seasonCode || result.competizione !== "Campionato") continue;
    const code = leagueCodes.get(result.lega);
    if (!code) continue;
    const previous = historicalLeagueByTeam.get(result.squadraId);
    if (previous && previous !== code) throw new Error(`Società ${result.squadraId} associata a più campionati nella stagione ${seasonCode}.`);
    historicalLeagueByTeam.set(result.squadraId, code);
  }
  const leagueByTeam = new Map<number, string>();
  const add = (value: unknown, id: unknown) => { const key = normalizeSocietaName(String(value ?? "")); if (!key) return; const ids = names.get(key) ?? new Set<number>(); ids.add(Number(id)); names.set(key, ids); };
  for (const team of teams ?? []) {
    const id = Number(team.id);
    validIds.add(id); add(team.nome_ufficiale, id); add(team.nome_personalizzato, id);
    const league = historicalLeagueByTeam.get(id) ?? (activeSeason ? currentLeagueCode(team.categoria, team.girone) : null);
    if (league) leagueByTeam.set(id, league);
  }
  for (const alias of aliases ?? []) add(alias.alias, alias.societa_id);
  return {
    resolve(value: string) { const ids = [...(names.get(normalizeSocietaName(value)) ?? [])]; const id = ids.length === 1 ? ids[0] : null; return { societaId: id, legaCodice: id ? leagueByTeam.get(id) ?? null : null, ambiguous: ids.length > 1 }; },
    resolveId(id: number) { return { societaId: validIds.has(id) ? id : null, legaCodice: leagueByTeam.get(id) ?? null }; },
    expectedSocietaIds(legaCodice: string) { return [...leagueByTeam.entries()].filter(([, league]) => league === legaCodice).map(([id]) => id); },
  };
}

async function prepare(bytes: Uint8Array, seasonId: number) {
  const { data: season, error: seasonError } = await admin().from("stagioni").select("codice,attiva").eq("id", seasonId).single();
  if (seasonError || !season) throw new Error("Impossibile confrontare la rosa corrente. Verifica che la migration Rose sia stata applicata.");
  const parsed = parseRoseBuffer(bytes, await resolver(String(season.codice), Boolean(season.attiva)), String(season.codice));
  const targetLeagueCode = parsed.targetLeagueCode;
  const existingQuery = admin().from("rose_giocatori").select("lega_codice,societa_id,giocatore,giocatore_normalizzato,squadra_reale,ruolo,prezzo").eq("stagione_id", seasonId);
  const { data, error } = targetLeagueCode ? await existingQuery.eq("lega_codice", targetLeagueCode) : { data: [], error: null };
  if (error) throw new Error("Impossibile confrontare la rosa corrente. Verifica che la migration Rose sia stata applicata.");
  const existing = (data ?? []) as ExistingRoseRow[];
  return { parsed, existing, diff: diffRoseSnapshot(parsed.rows, existing), targetLeagueCode };
}

export async function createRosePreview(formData: FormData, userId: string): Promise<ImportPreview> {
  const file = validateImportFile(formData.get("file") instanceof File ? formData.get("file") as File : null);
  const seasonId = Number(formData.get("seasonId")); const seasonLabel = String(formData.get("seasonLabel") ?? "").trim();
  if (!Number.isSafeInteger(seasonId) || seasonId <= 0 || !seasonLabel) throw new Error("Seleziona una stagione valida.");
  const bytes = new Uint8Array(await file.arrayBuffer()); const hash = sha256(bytes);
  const { data: season, error: seasonError } = await admin().from("stagioni").select("id,codice").eq("id", seasonId).single();
  if (seasonError || !season) throw new Error("Stagione non valida.");
  const { data: importRow, error: importError } = await admin().from("importazioni").insert({ tipo: "rose", stagione_id: seasonId, edizione_competizione_id: null, nome_file: file.name, file_hash: hash, dimensione_file: file.size, stato: "anteprima", importato_da: userId }).select("id").single();
  if (importError || !importRow) throw new Error("Impossibile creare il record di importazione Rose.");
  try {
    const { parsed, existing, diff, targetLeagueCode } = await prepare(bytes, seasonId);
    const currentByPlayer = new Map(existing.map((row) => [`${row.lega_codice}:${row.giocatore_normalizzato}`, row]));
    const statusByPlayer = new Map<string, "nuovo" | "trasferito" | "aggiornato" | "invariato">();
    const changes: ImportChange[] = parsed.rows.map((row) => {
      const current = currentByPlayer.get(`${row.legaCodice}:${row.giocatoreNormalizzato}`);
      const transferred = Boolean(current && current.societa_id !== row.societaId);
      const updated = Boolean(current && (
        current.giocatore !== row.giocatore
        || (current.squadra_reale ?? null) !== row.squadraReale
        || current.ruolo !== row.ruolo
        || Number(current.prezzo) !== row.prezzo
      ));
      const status = !current ? "nuovo" : transferred ? "trasferito" : updated ? "aggiornato" : "invariato";
      statusByPlayer.set(`${row.legaCodice}:${row.giocatoreNormalizzato}`, status);
      return {
        entity: "rosa",
        kind: status === "nuovo" ? "insert" : status === "invariato" ? "unchanged" : "update",
        title: `${row.societa} · ${row.giocatore}`,
        detail: [row.squadraReale ?? "Squadra reale non indicata", `Ruolo ${row.ruolo}`, `Prezzo ${row.prezzo}`, `Stato ${status}`],
      };
    });
    const summary = { giornate: 0, partite: 0, riposi: 0, societaRiconosciute: parsed.recognizedTeams, societaNonRiconosciute: parsed.unknownTeams, insert: diff.insert, update: diff.update, unchanged: diff.unchanged, existing: parsed.rows.length - diff.insert, replace: 0, warning: parsed.warnings.length, error: parsed.errors.length, calciatori: parsed.rows.length, trasferimenti: diff.transfer, rimossi: diff.remove, legaCodice: targetLeagueCode };
    await admin().from("importazioni").update({ righe_totali: parsed.totalRows, righe_valide: parsed.rows.length, righe_inserite: diff.insert, righe_aggiornate: diff.update, righe_invariate: diff.unchanged, righe_scartate: parsed.errors.length, warning_count: parsed.warnings.length, error_count: parsed.errors.length, riepilogo: summary, warning: parsed.warnings, errori: parsed.errors }).eq("id", importRow.id);
    return { importId: String(importRow.id), developmentOnly: false, publishEnabled: parsed.errors.length === 0 && parsed.rows.length > 0 && Boolean(targetLeagueCode), fileName: file.name, fileHash: hash, seasonLabel, competitionLabel: targetLeagueCode ? `Rose · ${targetLeagueCode}` : "Rose", competitionCode: "rose", importType: "rose", targetLeagueCode: targetLeagueCode ?? undefined, summary, changes, warnings: parsed.warnings.map((issue) => ({ codice: issue.code, messaggio: issue.message, riga: issue.row, valore: issue.value })), errors: parsed.errors.map((issue) => ({ codice: issue.code, messaggio: issue.message, riga: issue.row, valore: issue.value })), roseRows: parsed.rows.map((row) => ({ societa: row.societa, giocatore: row.giocatore, squadraReale: row.squadraReale, ruolo: row.ruolo, prezzo: row.prezzo, stato: statusByPlayer.get(`${row.legaCodice}:${row.giocatoreNormalizzato}`) ?? "invariato" })) };
  } catch (error) {
    await admin().from("importazioni").update({ stato: "errore", completata_il: new Date().toISOString(), error_count: 1 }).eq("id", importRow.id);
    throw error;
  }
}

export async function publishRoseImport(formData: FormData) {
  const importId = String(formData.get("importId") ?? ""); const file = validateImportFile(formData.get("file") instanceof File ? formData.get("file") as File : null); const bytes = new Uint8Array(await file.arrayBuffer());
  const { data: record, error } = await admin().from("importazioni").select("*").eq("id", importId).eq("tipo", "rose").single();
  if (error || !record) throw new Error("Importazione Rose non trovata.");
  if (record.stato !== "anteprima" || Number(record.error_count) > 0 || sha256(bytes) !== record.file_hash) throw new Error("L’importazione Rose non corrisponde all’anteprima validata.");
  const { parsed, diff, targetLeagueCode } = await prepare(bytes, Number(record.stagione_id)); if (parsed.errors.length || !parsed.rows.length || !targetLeagueCode) throw new Error("La nuova validazione Rose contiene errori bloccanti.");
  const previewSummary = record.riepilogo as Record<string, unknown> | null;
  if (previewSummary?.legaCodice !== targetLeagueCode || Number(previewSummary?.insert) !== diff.insert || Number(previewSummary?.update) !== diff.update || Number(previewSummary?.rimossi) !== diff.remove || Number(previewSummary?.unchanged) !== diff.unchanged) throw new Error("Lo stato delle Rose è cambiato dopo l’anteprima. Crea una nuova anteprima prima di pubblicare.");
  const { data: lock } = await admin().from("importazioni").update({ stato: "validata" }).eq("id", importId).eq("stato", "anteprima").select("id").maybeSingle(); if (!lock) throw new Error("Importazione già elaborata.");
  const payload = parsed.rows.map((row) => ({ lega_codice: row.legaCodice, societa_id: row.societaId, giocatore: row.giocatore, giocatore_normalizzato: row.giocatoreNormalizzato, squadra_reale: row.squadraReale, ruolo: row.ruolo, prezzo: row.prezzo }));
  const { data: result, error: publishError } = await admin().rpc("admin_publish_rose_snapshot", { p_stagione_id: Number(record.stagione_id), p_lega_codice: targetLeagueCode, p_import_id: importId, p_rows: payload });
  if (publishError) { await admin().from("importazioni").update({ stato: "errore", completata_il: new Date().toISOString(), error_count: 1 }).eq("id", importId); throw publishError; }
  const row = Array.isArray(result) ? result[0] : result;
  if (Number(row?.inserted ?? 0) !== diff.insert || Number(row?.updated ?? 0) !== diff.update || Number(row?.removed ?? 0) !== diff.remove || Number(row?.unchanged ?? 0) !== diff.unchanged) throw new Error("Il risultato pubblicato non coincide con l’anteprima Rose.");
  await admin().from("importazioni").update({ stato: "pubblicata", completata_il: new Date().toISOString(), righe_inserite: Number(row?.inserted ?? 0), righe_aggiornate: Number(row?.updated ?? 0), righe_invariate: Number(row?.unchanged ?? 0) }).eq("id", importId);
  return row;
}
