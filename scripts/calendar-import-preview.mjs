#!/usr/bin/env node
import path from "node:path";
import { createProjectSocietaResolver, parseCalendarWorkbook } from "./lib/calendar-import.mjs";

const input = process.argv[2];
if (!input) {
  console.error("Uso: npm run test:calendar-import -- <percorso-file.xlsx>");
  process.exitCode = 1;
} else {
  const filePath = path.resolve(input);
  const parsed = parseCalendarWorkbook(filePath, { resolver: createProjectSocietaResolver() });
  const calculated = parsed.matches.filter((match) => match.stato === "calcolata").length;
  const recognized = new Set(parsed.matches.flatMap((match) => [match.casa, match.trasferta]).filter((team) => team.societaId !== null).map((team) => team.name));
  console.log("\nANTEPRIMA IMPORT CALENDARIO");
  console.log(`File: ${filePath}`);
  console.log(`Fogli: ${parsed.workbook.sheetNames.join(", ")}`);
  console.log(`Giornate trovate: ${parsed.days.length} (${parsed.days.join(", ")})`);
  console.log(`Partite trovate: ${parsed.matches.length}`);
  console.log(`Partite programmate: ${parsed.matches.length - calculated}`);
  console.log(`Partite calcolate: ${calculated}`);
  console.log(`Riposi trovati: ${parsed.rests.length}`);
  console.log(`Fasi trovate: ${parsed.phases.length}${parsed.phases.length ? ` (${parsed.phases.join(", ")})` : ""}`);
  const groups = [...new Set([...parsed.matches, ...parsed.rests].map((event) => event.girone).filter(Boolean))].sort();
  console.log(`Gironi trovati: ${groups.length}${groups.length ? ` (${groups.join(", ")})` : ""}`);
  console.log(`Società riconosciute: ${recognized.size}`);
  console.log(`Società non riconosciute: ${parsed.diagnostics.unknownNames.length}${parsed.diagnostics.unknownNames.length ? ` (${parsed.diagnostics.unknownNames.join(", ")})` : ""}`);
  console.log(`Nomi ambigui: ${parsed.diagnostics.ambiguousNames.length}`);
  console.log(`Duplicati: ${parsed.diagnostics.duplicates.length + parsed.diagnostics.restDuplicates.length} (partite: ${parsed.diagnostics.duplicates.length}, riposi: ${parsed.diagnostics.restDuplicates.length})`);
  console.log(`Righe incomplete: ${parsed.diagnostics.incompleteRows.length}`);
  console.log(`Giornate incomplete: ${parsed.diagnostics.incompleteDays.length}`);
  console.log(`Anomalie: ${parsed.diagnostics.anomalies.length}`);
  console.log(`Valori di raggruppamento non interpretabili: ${parsed.diagnostics.uninterpretableValues.length}${parsed.diagnostics.uninterpretableValues.length ? ` (${parsed.diagnostics.uninterpretableValues.join(", ")})` : ""}`);
  console.log("\nPrime 10 partite normalizzate:");
  console.table(parsed.matches.slice(0, 10).map((match) => ({
    giornata_lega: match.giornataLega,
    giornata_serie_a: match.giornataSerieA,
    casa: match.casa.name,
    societa_casa_id: match.casa.societaId,
    trasferta: match.trasferta.name,
    societa_trasferta_id: match.trasferta.societaId,
    fantapunti: `${match.fantapuntiCasa ?? "—"} - ${match.fantapuntiTrasferta ?? "—"}`,
    risultato: match.golCasa === null ? "—" : `${match.golCasa}-${match.golTrasferta}`,
    stato: match.stato,
    fase: match.fase ?? "—",
    girone: match.girone ?? "—",
  })));
  if (parsed.rests.length) {
    console.log("\nRiposi normalizzati:");
    console.table(parsed.rests.map((rest) => ({ giornata_lega: rest.giornataLega, giornata_serie_a: rest.giornataSerieA, societa: rest.societa.name, societa_id: rest.societa.societaId, fase: rest.fase, girone: rest.girone, raggruppamento: rest.raggruppamento })));
  }
  if (parsed.diagnostics.incompleteRows.length) {
    console.log("\nRighe incomplete:");
    console.table(parsed.diagnostics.incompleteRows);
  }
}
