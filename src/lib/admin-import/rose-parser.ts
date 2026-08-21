import * as XLSX from "xlsx";

export const ROSE_REQUIRED_COLUMNS = ["Squadra", "Nome", "Ruolo", "Prezzo"] as const;
export const ROSE_USED_COLUMNS = [...ROSE_REQUIRED_COLUMNS, "Squadra_Appartenenza"] as const;
export const ROSE_LEGACY_COLUMNS = ["Stagione", "Lega", "Squadra_ID", "Ruolo", "Giocatore", "Squadra_Reale", "Costo"] as const;
export const ROSE_IGNORED_COLUMNS = ["Ruoli_Mantra", "Quotazione", "Quotazione_Mantra", "Fantacalcio_Id"] as const;
const ROLES = new Set(["P", "D", "C", "A"]);
const LEAGUES = new Set(["default", "serie-a", "serie-b", "serie-c-girone-a", "serie-c-girone-b", "serie-c-girone-c"]);

export type RoseResolverResult = { societaId: number | null; legaCodice?: string | null; ambiguous?: boolean };
export type RoseResolver = {
  resolve(name: string): RoseResolverResult;
  resolveId?(id: number): RoseResolverResult;
  expectedSocietaIds?(legaCodice: string): number[];
};
export type ParsedRoseRow = { row: number; legaCodice: string; societaId: number; societa: string; giocatore: string; giocatoreNormalizzato: string; squadraReale: string | null; ruolo: string; prezzo: number };
export type RoseIssue = { code: string; message: string; row?: number; value?: string };
export type ParsedRose = { rows: ParsedRoseRow[]; errors: RoseIssue[]; warnings: RoseIssue[]; totalRows: number; headers: string[]; recognizedTeams: number; unknownTeams: string[]; targetLeagueCode: string | null };

export function normalizePlayerName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function text(value: unknown) { return String(value ?? "").replace(/^\uFEFF/, "").trim().normalize("NFC"); }
function price(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null;
}

function isExcelBinary(buffer: Uint8Array) {
  const zip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  const compound = buffer.length >= 8 && [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => buffer[index] === byte);
  return zip || compound;
}

function readRoseWorkbook(buffer: Uint8Array) {
  if (isExcelBinary(buffer)) return XLSX.read(buffer, { type: "array", raw: true });
  let csv: string;
  try {
    csv = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("Il CSV Rose non è UTF-8 valido. Esportalo in UTF-8 e riprova.");
  }
  return XLSX.read(csv, { type: "string", raw: true });
}

export function parseRoseBuffer(buffer: Uint8Array, resolver: RoseResolver, expectedSeason?: string): ParsedRose {
  const workbook = readRoseWorkbook(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) return { rows: [], errors: [{ code: "FILE_VUOTO", message: "Il file Rose è vuoto." }], warnings: [], totalRows: 0, headers: [], recognizedTeams: 0, unknownTeams: [], targetLeagueCode: null };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  const headers = (matrix[0] ?? []).map((value) => text(value));
  const index = new Map(headers.map((header, position) => [header, position]));
  const errors: RoseIssue[] = [];
  const legacy = ROSE_LEGACY_COLUMNS.every((column) => index.has(column));
  const requiredColumns = legacy ? ROSE_LEGACY_COLUMNS : ROSE_REQUIRED_COLUMNS;
  for (const required of requiredColumns) if (!index.has(required)) errors.push({ code: "COLONNA_MANCANTE", message: `Colonna obbligatoria mancante: ${required}.`, value: required });
  if (errors.length) return { rows: [], errors, warnings: [], totalRows: Math.max(0, matrix.length - 1), headers, recognizedTeams: 0, unknownTeams: [], targetLeagueCode: null };

  const rows: ParsedRoseRow[] = []; const unknown = new Set<string>(); const seen = new Map<string, ParsedRoseRow>();
  for (let offset = 1; offset < matrix.length; offset++) {
    const source = matrix[offset] ?? []; const rowNumber = offset + 1;
    if (source.every((value) => text(value) === "")) continue;
    const teamName = legacy ? text(source[index.get("Squadra_ID")!]) : text(source[index.get("Squadra")!]);
    const playerName = legacy ? text(source[index.get("Giocatore")!]) : text(source[index.get("Nome")!]);
    const role = text(source[index.get("Ruolo")!]).toUpperCase();
    const rawPrice = source[index.get(legacy ? "Costo" : "Prezzo")!];
    const parsedPrice = price(rawPrice);
    const realTeam = legacy ? text(source[index.get("Squadra_Reale")!]) : index.has("Squadra_Appartenenza") ? text(source[index.get("Squadra_Appartenenza")!]) : "";
    const requestedLeague = legacy ? text(source[index.get("Lega")!]).toLocaleLowerCase("it") : "";
    if (legacy && !playerName && !role && !text(rawPrice) && !realTeam) continue;
    const sourceSeason = legacy ? text(source[index.get("Stagione")!]) : "";
    if (expectedSeason && sourceSeason && sourceSeason !== expectedSeason) {
      errors.push({ code: "STAGIONE_NON_COHERENTE", message: `La riga appartiene alla stagione ${sourceSeason}, non a ${expectedSeason}.`, row: rowNumber, value: sourceSeason });
      continue;
    }
    if (!teamName) errors.push({ code: "SOCIETA_MANCANTE", message: "Società mancante.", row: rowNumber });
    if (!playerName) errors.push({ code: "NOME_MANCANTE", message: "Nome calciatore mancante.", row: rowNumber });
    if (!ROLES.has(role)) errors.push({ code: "RUOLO_NON_VALIDO", message: `Ruolo Classic non valido: ${role || "vuoto"}.`, row: rowNumber, value: role });
    if (legacy && !LEAGUES.has(requestedLeague)) errors.push({ code: "LEGA_NON_VALIDA", message: `Lega Rose non valida: ${requestedLeague || "vuota"}.`, row: rowNumber, value: requestedLeague });
    if (parsedPrice === null || parsedPrice < 0) errors.push({ code: "PREZZO_NON_VALIDO", message: `Prezzo non valido: ${text(source[index.get("Prezzo")!]) || "vuoto"}.`, row: rowNumber });
    if (!teamName || !playerName || !ROLES.has(role) || (legacy && !LEAGUES.has(requestedLeague)) || parsedPrice === null || parsedPrice < 0) continue;
    const legacyId = legacy && /^\d+$/.test(teamName) ? Number(teamName) : null;
    const resolved = legacyId !== null && resolver.resolveId ? resolver.resolveId(legacyId) : resolver.resolve(teamName);
    if (resolved.ambiguous) { errors.push({ code: "SOCIETA_AMBIGUA", message: `Società ambigua: ${teamName}.`, row: rowNumber, value: teamName }); continue; }
    if (resolved.societaId === null) { unknown.add(teamName); errors.push({ code: "SOCIETA_NON_RICONOSCIUTA", message: `Società non riconosciuta: ${teamName}.`, row: rowNumber, value: teamName }); continue; }
    const legaCodice = resolved.legaCodice ?? null;
    if (!legaCodice || !LEAGUES.has(legaCodice) || legaCodice === "default") {
      errors.push({ code: "LEGA_NON_DETERMINATA", message: `Impossibile determinare la lega della società ${teamName}.`, row: rowNumber, value: teamName });
      continue;
    }
    if (legacy && requestedLeague !== legaCodice) {
      errors.push({ code: "SOCIETA_LEGA_NON_COHERENTE", message: `La società ${teamName} appartiene a ${legaCodice}, non a ${requestedLeague}.`, row: rowNumber, value: requestedLeague });
      continue;
    }
    const giocatoreNormalizzato = normalizePlayerName(playerName);
    const parsed: ParsedRoseRow = { row: rowNumber, legaCodice, societaId: resolved.societaId, societa: teamName, giocatore: playerName, giocatoreNormalizzato, squadraReale: realTeam || null, ruolo: role, prezzo: parsedPrice };
    const playerKey = `${legaCodice}:${giocatoreNormalizzato}`;
    const previous = seen.get(playerKey);
    if (previous) { errors.push({ code: "CALCIATORE_DUPLICATO", message: `${playerName} compare più volte nella fotografia Rose${previous.societaId !== parsed.societaId ? " ed è assegnato a società differenti" : ""}.`, row: rowNumber, value: playerName }); continue; }
    seen.set(playerKey, parsed); rows.push(parsed);
  }
  if (!rows.length && !errors.length) errors.push({ code: "FILE_VUOTO", message: "Il file non contiene calciatori." });
  const leagues = [...new Set(rows.map((row) => row.legaCodice))];
  const targetLeagueCode = leagues.length === 1 ? leagues[0] : null;
  if (leagues.length > 1) errors.push({ code: "LEGA_MULTIPLA", message: `Il file contiene società di più leghe (${leagues.join(", ")}). Ogni import Rose deve contenere una sola lega completa.` });
  if (targetLeagueCode && resolver.expectedSocietaIds) {
    const expected = new Set(resolver.expectedSocietaIds(targetLeagueCode));
    const present = new Set(rows.map((row) => row.societaId));
    const missing = [...expected].filter((id) => !present.has(id)).sort((a, b) => a - b);
    const unexpected = [...present].filter((id) => !expected.has(id)).sort((a, b) => a - b);
    if (missing.length || unexpected.length) errors.push({
      code: "SNAPSHOT_LEGA_INCOMPLETO",
      message: `Snapshot ${targetLeagueCode} incompleto: attese ${expected.size} società, presenti ${present.size}. ID mancanti: ${missing.join(", ") || "nessuno"}. ID inattesi: ${unexpected.join(", ") || "nessuno"}.`,
    });
  }
  return { rows, errors, warnings: [], totalRows: matrix.slice(1).filter((row) => !row.every((value) => text(value) === "")).length, headers, recognizedTeams: new Set(rows.map((row) => row.societaId)).size, unknownTeams: [...unknown], targetLeagueCode };
}

export type ExistingRoseRow = { lega_codice: string; societa_id: number; giocatore: string; giocatore_normalizzato: string; squadra_reale: string | null; ruolo: string; prezzo: number };
export function diffRoseSnapshot(incoming: ParsedRoseRow[], existing: ExistingRoseRow[]) {
  const current = new Map(existing.map((row) => [`${row.lega_codice}:${row.giocatore_normalizzato}`, row])); const next = new Map(incoming.map((row) => [`${row.legaCodice}:${row.giocatoreNormalizzato}`, row]));
  let insert = 0, update = 0, transfer = 0, unchanged = 0, remove = 0;
  for (const row of incoming) { const before = current.get(`${row.legaCodice}:${row.giocatoreNormalizzato}`); if (!before) insert++; else if (Number(before.societa_id) !== row.societaId) { transfer++; update++; } else if (before.giocatore !== row.giocatore || (before.squadra_reale ?? null) !== row.squadraReale || before.ruolo !== row.ruolo || Number(before.prezzo) !== row.prezzo) update++; else unchanged++; }
  for (const row of existing) if (!next.has(`${row.lega_codice}:${row.giocatore_normalizzato}`)) remove++;
  return { insert, update, transfer, unchanged, remove };
}
