import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const DAY_HEADER = /^(\d+)[ªa]?\s+Giornata\s+(lega|serie\s*a)$/i;
const RESULT = /^\s*(\d+)\s*[-–—]\s*(\d+)\s*$/;
const PHASES = new Map([
  ["faseagironi", "Fase a Gironi"],
  ["semifinali", "Semifinali"],
  ["finale", "Finale"],
]);

const LAYOUTS = {
  campionato: { name: "campionato", sideOffsets: [0, 6], seriesDay: 2, grouping: null, home: 0, homeFantasy: 1, awayFantasy: 2, away: 3, result: 4 },
  coppaQualificazione: { name: "competizione", sideOffsets: [0, 6], seriesDay: 2, grouping: null, home: 0, homeFantasy: 1, awayFantasy: 2, away: 3, result: 4 },
  competizione: { name: "competizione", sideOffsets: [0, 7], seriesDay: 3, grouping: 0, home: 1, homeFantasy: 2, awayFantasy: 3, away: 4, result: 5 },
};

export function normalizeSocietaName(value) {
  return String(value ?? "")
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function parseCsv(text) {
  const records = [];
  let record = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      record.push(value.trim()); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(value.trim()); value = "";
      if (record.some(Boolean)) records.push(record);
      record = [];
    } else value += character;
  }
  if (value || record.length) { record.push(value.trim()); records.push(record); }
  const headers = (records.shift() ?? []).map((header) => header.replace(/^\uFEFF/, ""));
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsvIfPresent(root, name) {
  const filePath = path.join(root, "data", name);
  return fs.existsSync(filePath) ? parseCsv(fs.readFileSync(filePath, "utf8")) : [];
}

export function createProjectSocietaResolver(root = process.cwd()) {
  const societa = readCsvIfPresent(root, "societa.csv");
  const knownIds = new Set(societa.map((row) => Number(row.ID_Squadra)).filter(Number.isInteger));
  const byNormalized = new Map();
  const add = (societaId, alias, source) => {
    const normalized = normalizeSocietaName(alias);
    if (!knownIds.has(societaId) || !normalized) return;
    const entries = byNormalized.get(normalized) ?? [];
    if (!entries.some((entry) => entry.societaId === societaId)) entries.push({ societaId, alias: String(alias).trim(), source });
    byNormalized.set(normalized, entries);
  };
  societa.forEach((row) => add(Number(row.ID_Squadra), row["Nome_Società"], "societa.nome_ufficiale"));
  const sources = [
    ["storie_societa.csv", "Squadra_ID", "Nome_Societa", "storia"],
    ["societa_emblemi.csv", "ID_Squadra", "Nome_Società", "emblemi"],
    ["ranking.csv", "Squadra_ID", "Nome_Ranking", "ranking"],
    ["sala_trofei.csv", "Squadra_ID", "Nome_Squadra", "sala_trofei"],
    ["risultati.csv", "Squadra_ID", "Nome_Storico", "risultati_storici"],
  ];
  sources.forEach(([file, idColumn, nameColumn, source]) => {
    readCsvIfPresent(root, file).forEach((row) => add(Number(row[idColumn]), row[nameColumn], source));
  });
  return {
    resolve(name) {
      const normalized = normalizeSocietaName(name);
      const matches = byNormalized.get(normalized) ?? [];
      return { input: name, normalized, matches, societaId: matches.length === 1 ? matches[0].societaId : null };
    },
  };
}

function text(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned && cleaned !== "-" ? cleaned : null;
}

function decimal(value) {
  if (value === null || value === undefined || value === "" || String(value).trim() === "-") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseGoalResult(value) {
  const match = text(value)?.match(RESULT);
  return match ? { home: Number(match[1]), away: Number(match[2]) } : null;
}

function dayNumber(value, kind) {
  const match = text(value)?.match(DAY_HEADER);
  return match && normalizeSocietaName(match[2]) === normalizeSocietaName(kind) ? Number(match[1]) : null;
}

function logicalKey(match) {
  return `${match.giornataLega}:${match.casa.normalized}:${match.trasferta.normalized}`;
}

function restName(value) {
  const match = text(value)?.match(/^Riposa\s+(.+)$/i);
  return match && text(match[1]) ? match[1].trim() : null;
}

function grouping(value) {
  const raw = text(value);
  return {
    raggruppamento: raw,
    girone: raw && /^[a-z]$/i.test(raw) ? raw.toUpperCase() : null,
  };
}

function detectLayout(rows, calendarType) {
  const hasCompetitionPhase = rows.some((row) => row.some((value) => PHASES.has(normalizeSocietaName(value))));
  const hasWideDayHeader = rows.some((row) => dayNumber(row[7], "lega") !== null);
  const pairedLeagueDays = new Set(rows.flatMap((row) => [dayNumber(row[0], "lega"), dayNumber(row[6], "lega")]).filter((value) => value !== null));
  if (calendarType === "calendario_coppa" && !hasCompetitionPhase && !hasWideDayHeader && pairedLeagueDays.size > 0) return LAYOUTS.coppaQualificazione;
  if (!calendarType && pairedLeagueDays.size === 14) return LAYOUTS.coppaQualificazione;
  return hasCompetitionPhase || hasWideDayHeader ? LAYOUTS.competizione : LAYOUTS.campionato;
}

function parseCalendarData(data, readOptions, options = {}) {
  const resolver = options.resolver ?? { resolve: (name) => ({ input: name, normalized: normalizeSocietaName(name), matches: [], societaId: null }) };
  const workbook = XLSX.read(data, { ...readOptions, cellDates: true, cellFormula: true });
  const sheetName = options.sheetName ?? workbook.SheetNames.find((name) => normalizeSocietaName(name) === "calendario") ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Il workbook non contiene fogli leggibili.");
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true });
  const layout = options.layout ?? detectLayout(rows, options.calendarType);
  const expectedDays = options.expectedDays ?? (layout.name === "campionato" ? 38 : null);
  const phaseMarkers = rows.flatMap((row, rowIndex) => row.map((value) => ({ rowIndex, phase: PHASES.get(normalizeSocietaName(value)) })).filter((entry) => entry.phase));
  const headers = [];
  rows.forEach((row, rowIndex) => layout.sideOffsets.forEach((offset) => {
    const giornataLega = dayNumber(row[offset], "lega");
    if (giornataLega === null) return;
    const phase = [...phaseMarkers].reverse().find((entry) => entry.rowIndex < rowIndex)?.phase ?? null;
    headers.push({ rowIndex, offset, giornataLega, giornataSerieA: dayNumber(row[offset + layout.seriesDay], "serie a"), phase });
  }));

  const matches = [];
  const rests = [];
  const incompleteRows = [];
  const anomalies = [];
  const unknownNames = new Set();
  const ambiguousNames = new Set();
  const seen = new Map();
  const duplicates = [];
  const restSeen = new Map();
  const restDuplicates = [];
  const uninterpretableValues = new Set();
  const structuralRows = [...new Set([...headers.map((header) => header.rowIndex), ...phaseMarkers.map((marker) => marker.rowIndex)])].sort((a, b) => a - b);
  const resolveAndTrack = (name) => {
    const resolved = resolver.resolve(name);
    if (resolved.matches.length > 1) ambiguousNames.add(resolved.input);
    else if (resolved.societaId === null) unknownNames.add(resolved.input);
    return resolved;
  };
  for (const header of headers) {
    const sectionEnd = structuralRows.find((rowIndex) => rowIndex > header.rowIndex) ?? rows.length;
    for (let sourceRowIndex = header.rowIndex + 1; sourceRowIndex < sectionEnd; sourceRowIndex += 1) {
      const row = rows[sourceRowIndex] ?? [];
      const relevantCells = Array.from({ length: layout.result + 1 }, (_, index) => row[header.offset + index]);
      if (!relevantCells.some((value) => text(value) !== null || typeof value === "number")) continue;
      const group = grouping(layout.grouping === null ? null : row[header.offset + layout.grouping]);
      if (group.raggruppamento && !group.girone) uninterpretableValues.add(group.raggruppamento);
      const restNames = relevantCells.map(restName).filter(Boolean);
      if (restNames.length === 1) {
        const team = resolveAndTrack(restNames[0]);
        const normalizedRest = {
          source: { sheet: sheetName, row: sourceRowIndex + 1 },
          edizioneCompetizioneId: options.edizioneCompetizioneId ?? null,
          giornataLega: header.giornataLega,
          giornataSerieA: header.giornataSerieA,
          fase: header.phase,
          girone: group.girone,
          raggruppamento: group.raggruppamento,
          societa: { name: restNames[0], normalized: team.normalized, societaId: team.societaId },
        };
        const restKey = `${normalizedRest.giornataLega}:${normalizedRest.societa.normalized}`;
        if (restSeen.has(restKey)) restDuplicates.push({ key: restKey, first: restSeen.get(restKey), duplicate: normalizedRest.source });
        else restSeen.set(restKey, normalizedRest.source);
        rests.push(normalizedRest);
        continue;
      }
      if (restNames.length > 1) {
        anomalies.push({ type: "riposo_ambiguo", sheet: sheetName, row: sourceRowIndex + 1, giornataLega: header.giornataLega });
        incompleteRows.push({ sheet: sheetName, row: sourceRowIndex + 1, giornataLega: header.giornataLega, casa: null, trasferta: null });
        continue;
      }
      const rawHome = text(row[header.offset + layout.home]);
      const rawAway = text(row[header.offset + layout.away]);
      const rawHomeFantasy = decimal(row[header.offset + layout.homeFantasy]);
      const rawAwayFantasy = decimal(row[header.offset + layout.awayFantasy]);
      const goalResult = parseGoalResult(row[header.offset + layout.result]);
      if (!rawHome || !rawAway) {
        incompleteRows.push({ sheet: sheetName, row: sourceRowIndex + 1, giornataLega: header.giornataLega, casa: rawHome, trasferta: rawAway });
        continue;
      }
      const casa = resolveAndTrack(rawHome);
      const trasferta = resolveAndTrack(rawAway);
      const placeholders = !goalResult && rawHomeFantasy === 0 && rawAwayFantasy === 0;
      const hasAnyResultData = goalResult || (rawHomeFantasy !== null && rawHomeFantasy !== 0) || (rawAwayFantasy !== null && rawAwayFantasy !== 0);
      const calculated = Boolean(goalResult && rawHomeFantasy !== null && rawAwayFantasy !== null && rawHomeFantasy > 0 && rawAwayFantasy > 0);
      if (hasAnyResultData && !calculated) anomalies.push({ type: "risultato_parziale_o_ambiguo", sheet: sheetName, row: sourceRowIndex + 1, giornataLega: header.giornataLega });
      const normalized = {
        source: { sheet: sheetName, row: sourceRowIndex + 1 },
        edizioneCompetizioneId: options.edizioneCompetizioneId ?? null,
        giornataLega: header.giornataLega,
        giornataSerieA: header.giornataSerieA,
        fase: header.phase,
        girone: group.girone,
        raggruppamento: group.raggruppamento,
        casa: { name: rawHome, normalized: casa.normalized, societaId: casa.societaId },
        trasferta: { name: rawAway, normalized: trasferta.normalized, societaId: trasferta.societaId },
        fantapuntiCasa: calculated ? rawHomeFantasy : null,
        fantapuntiTrasferta: calculated ? rawAwayFantasy : null,
        golCasa: calculated ? goalResult.home : null,
        golTrasferta: calculated ? goalResult.away : null,
        stato: calculated ? "calcolata" : "programmata",
        placeholdersIgnorati: placeholders,
      };
      const key = logicalKey(normalized);
      if (seen.has(key)) duplicates.push({ key, first: seen.get(key), duplicate: normalized.source });
      else seen.set(key, normalized.source);
      matches.push(normalized);
    }
  }
  const incompleteDays = [...new Set(incompleteRows.map((row) => row.giornataLega))].sort((a, b) => a - b).map((day) => ({ day }));
  const days = [...new Set(headers.map((header) => header.giornataLega))].sort((a, b) => a - b);
  if (expectedDays !== null && days.length !== expectedDays) anomalies.push({ type: "numero_giornate_inatteso", found: days.length, expected: expectedDays });
  if (incompleteDays.length) anomalies.push({ type: "giornate_incomplete", count: incompleteDays.length });
  if (ambiguousNames.size) anomalies.push({ type: "nomi_ambigui", names: [...ambiguousNames].sort() });
  return {
    workbook: { sheetNames: workbook.SheetNames, sheetName, range: sheet["!ref"] ?? null, rows: rows.length, columns: XLSX.utils.decode_range(sheet["!ref"]).e.c + 1 },
    layout: { type: layout.name, headerRows: [...new Set(headers.map((header) => header.rowIndex + 1))] },
    days,
    phases: [...new Set(phaseMarkers.map((marker) => marker.phase))],
    matches,
    rests,
    diagnostics: { unknownNames: [...unknownNames].sort(), ambiguousNames: [...ambiguousNames].sort(), duplicates, restDuplicates, incompleteRows, incompleteDays, uninterpretableValues: [...uninterpretableValues].sort(), anomalies },
  };
}

export function parseCalendarWorkbook(filePath, options = {}) {
  return parseCalendarData(fs.readFileSync(filePath), { type: "buffer" }, options);
}

export function parseCalendarBuffer(buffer, options = {}) {
  return parseCalendarData(buffer, { type: "buffer" }, options);
}

export function validateCampionatoCalendarStructure(parsed) {
  const errors = [];
  const expectedDays = Array.from({ length: 38 }, (_, index) => index + 1);
  const actualDays = [...new Set(parsed.days)].sort((a, b) => a - b);
  if (actualDays.length !== 38) errors.push({ codice: "CAMPIONATO_NUMERO_GIORNATE", messaggio: `Calendario campionato incompleto: trovate ${actualDays.length} giornate su 38.` });
  for (const day of actualDays.filter((value) => value < 1 || value > 38)) errors.push({ codice: "CAMPIONATO_GIORNATA_FUORI_RANGE", messaggio: `Giornata ${day}: il valore deve essere compreso tra 1 e 38.` });
  for (const day of expectedDays) {
    const matches = parsed.matches.filter((match) => match.giornataLega === day);
    if (matches.length !== 10) errors.push({ codice: "CAMPIONATO_PARTITE_GIORNATA", messaggio: `Giornata ${day}: previste 10 partite, trovate ${matches.length}.` });
    const appearances = new Set(matches.flatMap((match) => [match.casa.societaId, match.trasferta.societaId]).filter((id) => id !== null));
    if (appearances.size !== 20) errors.push({ codice: "CAMPIONATO_PARTECIPANTI_GIORNATA", messaggio: `Giornata ${day}: previste 20 società distinte, trovate ${appearances.size}.` });
  }
  if (parsed.matches.length !== 380) errors.push({ codice: "CAMPIONATO_PARTITE_TOTALI", messaggio: `Calendario campionato: previste 380 partite, trovate ${parsed.matches.length}.` });
  return errors;
}

export function validateCoppaCalendarStructure(parsed) {
  const errors = [];
  const expectedDays = Array.from({ length: 14 }, (_, index) => index + 1);
  const actualDays = [...new Set(parsed.days)].sort((a, b) => a - b);
  if (actualDays.length !== 14) errors.push({ codice: "COPPA_NUMERO_GIORNATE", messaggio: `Calendario incompleto: trovate ${actualDays.length} giornate su 14.` });
  for (const day of actualDays.filter((value) => value < 1 || value > 14)) errors.push({ codice: "COPPA_GIORNATA_FUORI_RANGE", messaggio: `Giornata ${day}: il valore deve essere compreso tra 1 e 14.` });
  for (const day of expectedDays) {
    const matches = parsed.matches.filter((match) => match.giornataLega === day);
    if (matches.length !== 50) errors.push({ codice: "COPPA_PARTITE_GIORNATA", messaggio: `Giornata ${day}: previste 50 partite, trovate ${matches.length}.` });
    const appearances = new Map();
    const pairings = new Set();
    for (const match of matches) {
      const homeId = match.casa.societaId;
      const awayId = match.trasferta.societaId;
      if (homeId !== null && awayId !== null && homeId === awayId) errors.push({ codice: "COPPA_AUTOPARTITA", messaggio: `Giornata ${day}: la società ${match.casa.name} non può giocare contro se stessa.`, riga: match.source.row });
      const pairing = homeId !== null && awayId !== null ? [homeId, awayId].sort((a, b) => a - b).join(":") : [match.casa.normalized, match.trasferta.normalized].sort().join(":");
      if (pairings.has(pairing)) errors.push({ codice: "COPPA_PARTITA_DUPLICATA", messaggio: `Giornata ${day}: partita duplicata tra ${match.casa.name} e ${match.trasferta.name}.`, riga: match.source.row });
      pairings.add(pairing);
      for (const team of [match.casa, match.trasferta]) {
        if (team.societaId === null) continue;
        const count = (appearances.get(team.societaId) ?? 0) + 1;
        appearances.set(team.societaId, count);
        if (count === 2) errors.push({ codice: "COPPA_SOCIETA_DUPLICATA_GIORNATA", messaggio: `La società ${team.name} compare due volte nella giornata ${day}.`, riga: match.source.row });
      }
    }
    if (appearances.size !== 100) errors.push({ codice: "COPPA_PARTECIPANTI_GIORNATA", messaggio: `Giornata ${day}: previste 100 società distinte, trovate ${appearances.size}.` });
  }
  if (parsed.matches.length !== 700) errors.push({ codice: "COPPA_PARTITE_TOTALI", messaggio: `Calendario Coppa: previste 700 partite, trovate ${parsed.matches.length}.` });
  const participants = new Set(parsed.matches.flatMap((match) => [match.casa.societaId, match.trasferta.societaId]).filter((id) => id !== null));
  if (participants.size !== 100) errors.push({ codice: "COPPA_PARTECIPANTI_TOTALI", messaggio: `Prevista la partecipazione di 100 società, trovate ${participants.size}.` });
  return errors;
}

export function buildUpsertPayload(parsed, options) {
  if (!Number.isInteger(options.edizioneCompetizioneId) || options.edizioneCompetizioneId <= 0) throw new Error("edizioneCompetizioneId deve essere un intero positivo.");
  if (parsed.diagnostics.ambiguousNames.length || parsed.diagnostics.duplicates.length || parsed.diagnostics.restDuplicates.length || parsed.diagnostics.incompleteRows.length) throw new Error("Import bloccato: il parsing contiene dati ambigui, duplicati o righe incomplete.");
  return parsed.matches.map((match) => {
    if (match.casa.societaId === null || match.trasferta.societaId === null) throw new Error(`Import bloccato: società non risolta alla giornata ${match.giornataLega}.`);
    return {
      edizione_competizione_id: options.edizioneCompetizioneId,
      giornata_lega: match.giornataLega,
      giornata_serie_a: match.giornataSerieA,
      societa_casa_id: match.casa.societaId,
      societa_trasferta_id: match.trasferta.societaId,
      fantapunti_casa: match.fantapuntiCasa,
      fantapunti_trasferta: match.fantapuntiTrasferta,
      gol_casa: match.golCasa,
      gol_trasferta: match.golTrasferta,
      stato: match.stato,
      fonte_importazione: options.fonteImportazione ?? null,
      import_batch_id: options.importBatchId ?? null,
    };
  });
}

export function buildRestsUpsertPayload(parsed, options) {
  if (!Number.isInteger(options.edizioneCompetizioneId) || options.edizioneCompetizioneId <= 0) throw new Error("edizioneCompetizioneId deve essere un intero positivo.");
  if (parsed.diagnostics.ambiguousNames.length || parsed.diagnostics.duplicates.length || parsed.diagnostics.restDuplicates.length || parsed.diagnostics.incompleteRows.length) throw new Error("Import bloccato: il parsing contiene dati ambigui, duplicati o righe incomplete.");
  return parsed.rests.map((rest) => {
    if (rest.societa.societaId === null) throw new Error(`Import bloccato: società in riposo non risolta alla giornata ${rest.giornataLega}.`);
    return {
      edizione_competizione_id: options.edizioneCompetizioneId,
      giornata_lega: rest.giornataLega,
      giornata_serie_a: rest.giornataSerieA,
      societa_id: rest.societa.societaId,
      fase: rest.fase,
      girone: rest.girone,
      raggruppamento: rest.raggruppamento,
    };
  });
}

export function classifyUpsertChanges(payload, existingRows) {
  const key = (row) => `${row.edizione_competizione_id}:${row.giornata_lega}:${row.societa_casa_id}:${row.societa_trasferta_id}`;
  const existing = new Map(existingRows.map((row) => [key(row), row]));
  const fields = ["giornata_serie_a", "fantapunti_casa", "fantapunti_trasferta", "gol_casa", "gol_trasferta", "stato", "fonte_importazione", "import_batch_id"];
  return payload.reduce((plan, row) => {
    const current = existing.get(key(row));
    if (!current) plan.insert.push(row);
    else if (fields.some((field) => (current[field] ?? null) !== (row[field] ?? null))) plan.update.push(row);
    else plan.unchanged.push(row);
    return plan;
  }, { insert: [], update: [], unchanged: [] });
}
