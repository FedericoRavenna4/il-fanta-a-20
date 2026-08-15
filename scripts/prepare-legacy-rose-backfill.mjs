import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const LEAGUE_CODES = new Map([
  ["Serie A", "serie-a"],
  ["Serie B", "serie-b"],
  ["Serie C - Girone A", "serie-c-girone-a"],
  ["Serie C - Girone B", "serie-c-girone-b"],
  ["Serie C - Girone C", "serie-c-girone-c"],
]);

function csvRows(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const workbook = XLSX.read(text, { type: "string", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("CSV vuoto.");
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

export function buildLegacyRoseBackfill(roseBytes, resultsBytes, seasonCode, seasonId) {
  const memberships = new Map();
  for (const row of csvRows(resultsBytes)) {
    if (String(row.Stagione_ID).trim() !== String(seasonId) || String(row.Competizione).trim() !== "Campionato") continue;
    const societaId = Number(row.Squadra_ID);
    const leagueCode = LEAGUE_CODES.get(String(row.Lega).trim());
    if (!Number.isSafeInteger(societaId) || !leagueCode) throw new Error("Appartenenza campionato storica non valida.");
    const previous = memberships.get(societaId);
    if (previous && previous !== leagueCode) throw new Error(`La società ${societaId} appartiene a più campionati.`);
    memberships.set(societaId, leagueCode);
  }

  const rows = csvRows(roseBytes)
    .filter((row) => String(row.Giocatore).trim() !== "")
    .map((row) => {
      const rowSeason = String(row.Stagione).trim();
      const societaId = Number(row.Squadra_ID);
      const leagueCode = memberships.get(societaId);
      if (rowSeason !== seasonCode) throw new Error(`Stagione inattesa nel CSV Rose: ${rowSeason}.`);
      if (!leagueCode) throw new Error(`Nessun campionato storico per la società ${societaId}.`);
      return {
        Stagione: rowSeason,
        Lega: leagueCode,
        Squadra_ID: societaId,
        Ruolo: String(row.Ruolo).trim(),
        Giocatore: String(row.Giocatore).trim().normalize("NFC"),
        Squadra_Reale: String(row.Squadra_Reale).trim().normalize("NFC"),
        Costo: String(row.Costo).trim(),
      };
    });

  const unique = new Set(rows.map((row) => `${row.Lega}:${row.Giocatore.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}`));
  if (unique.size !== rows.length) throw new Error("Il backfill contiene duplicati nella stessa lega.");
  if (memberships.size !== 100) throw new Error(`Attese 100 società storiche, trovate ${memberships.size}.`);

  const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Stagione", "Lega", "Squadra_ID", "Ruolo", "Giocatore", "Squadra_Reale", "Costo"] });
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\r\n" });
  return { bytes: new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(csv)]), rows, memberships };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [rosePath, resultsPath, outputPath, seasonCode, seasonId] = process.argv.slice(2);
  if (!rosePath || !resultsPath || !outputPath || !seasonCode || !seasonId) {
    console.error("Uso: node scripts/prepare-legacy-rose-backfill.mjs <rose.csv> <risultati.csv> <output.csv> <stagione> <stagione_id>");
    process.exit(1);
  }
  const result = buildLegacyRoseBackfill(fs.readFileSync(rosePath), fs.readFileSync(resultsPath), seasonCode, seasonId);
  fs.writeFileSync(outputPath, result.bytes);
  console.log(`Preparato ${outputPath}: ${result.rows.length} calciatori, ${result.memberships.size} società.`);
}
