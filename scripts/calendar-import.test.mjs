import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import XLSX from "xlsx";
import { buildRestsUpsertPayload, buildUpsertPayload, classifyUpsertChanges, normalizeSocietaName, parseCalendarWorkbook, parseGoalResult, validateCampionatoCalendarStructure, validateCoppaCalendarStructure } from "./lib/calendar-import.mjs";

function fixture(rows) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "calendar-import-"));
  const filePath = path.join(directory, "fixture.xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Calendario");
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

const resolver = { resolve(name) { return { input: name, normalized: normalizeSocietaName(name), matches: [{ societaId: name === "Casa" ? 1 : 2 }], societaId: name === "Casa" ? 1 : 2 }; } };

test("normalizzazione coerente con public.normalize_societa_name", () => {
  assert.equal(normalizeSocietaName("  Fel-Làzio / FC  "), "fellaziofc");
});

test("separa risultati e accetta trattini tipografici", () => {
  assert.deepEqual(parseGoalResult("3-2"), { home: 3, away: 2 });
  assert.deepEqual(parseGoalResult("0–0"), { home: 0, away: 0 });
  assert.equal(parseGoalResult("-"), null);
});

test("parsa giornate dispari e pari, decimali e partite future", () => {
  const file = fixture([
    ["Test"], [], [],
    ["1ª Giornata lega", null, "7ª Giornata serie a", null, null, null, "2ª Giornata lega", null, "8ª Giornata serie a"],
    ["Casa", "66,5", "72.25", "Ospite", "3-2", null, "Casa", 0, 0, "Ospite", "-"],
  ]);
  const parsed = parseCalendarWorkbook(file, { resolver, expectedDays: 2, expectedMatchesPerDay: 1 });
  assert.deepEqual(parsed.days, [1, 2]);
  assert.equal(parsed.matches[0].stato, "calcolata");
  assert.equal(parsed.matches[0].fantapuntiCasa, 66.5);
  assert.equal(parsed.matches[0].golTrasferta, 2);
  assert.equal(parsed.matches[1].stato, "programmata");
  assert.equal(parsed.matches[1].fantapuntiCasa, null);
  assert.equal(parsed.matches[1].golCasa, null);
});

test("riconosce dinamicamente il layout ufficiale Coppa A:E e G:K 14x50x100", () => {
  const rows = [["Girone di qualificazione"]];
  for (let pair = 0; pair < 7; pair += 1) {
    rows.push([`${pair * 2 + 1}ª Giornata lega`, null, `${pair * 2 + 3}ª Giornata serie a`, null, null, null, `${pair * 2 + 2}ª Giornata lega`, null, `${pair * 2 + 4}ª Giornata serie a`]);
    for (let index = 0; index < 50; index += 1) rows.push([`Team ${index + 1}`, 0, 0, `Team ${index + 51}`, "-", null, `Team ${index + 1}`, 0, 0, `Team ${index + 51}`, "-"]);
    rows.push(["Riga informativa variabile"]);
  }
  const teamResolver = { resolve(name) { const societaId = Number(String(name).replace("Team ", "")); return { input: name, normalized: normalizeSocietaName(name), matches: [{ societaId }], societaId }; } };
  const parsed = parseCalendarWorkbook(fixture(rows), { resolver: teamResolver, calendarType: "calendario_coppa" });
  assert.equal(parsed.layout.type, "competizione");
  assert.equal(parsed.layout.headerRows.length, 7);
  assert.deepEqual(parsed.days, Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(parsed.matches.length, 700);
  assert.equal(parsed.matches.every((match) => match.stato === "programmata" && match.fantapuntiCasa === null && match.golCasa === null), true);
  assert.deepEqual(validateCoppaCalendarStructure(parsed), []);
});

test("distingue il placeholder 0/0 con trattino da un vero 0-0 esplicito", () => {
  const parsed = parseCalendarWorkbook(fixture([
    ["1ª Giornata lega", null, "3ª Giornata serie a"],
    ["Casa", 0, 0, "Ospite", "-"],
    ["Casa Due", 66.5, 65, "Ospite Due", "0-0"],
  ]), { resolver: { resolve(name) { const societaId = name.includes("Due") ? (name.startsWith("Casa") ? 3 : 4) : (name === "Casa" ? 1 : 2); return { input: name, normalized: normalizeSocietaName(name), matches: [{ societaId }], societaId }; } }, expectedDays: 1 });
  assert.deepEqual({ stato: parsed.matches[0].stato, fp: parsed.matches[0].fantapuntiCasa, gol: parsed.matches[0].golCasa }, { stato: "programmata", fp: null, gol: null });
  assert.deepEqual({ stato: parsed.matches[1].stato, fp: parsed.matches[1].fantapuntiCasa, gol: parsed.matches[1].golCasa }, { stato: "calcolata", fp: 66.5, gol: 0 });
});

test("blocca tutte le combinazioni di risultato parziale o ambiguo e accetta una correzione completa", () => {
  const cases = [
    { row: ["Casa", null, null, "Ospite", "3-1"], reason: /fantapunteggio casa mancante/ },
    { row: ["Casa", 66.5, 65, "Ospite", "-"], reason: /risultato mancante/ },
    { row: ["Casa", 66.5, null, "Ospite", "-"], reason: /risultato mancante.*fantapunteggio trasferta mancante/ },
    { row: ["Casa", 66.5, 65, "Ospite", "vittoria"], reason: /risultato non riconosciuto/ },
  ];
  for (const item of cases) {
    const parsed = parseCalendarWorkbook(fixture([["1ª Giornata lega", null, "3ª Giornata serie a"], item.row]), { resolver, expectedDays: 1 });
    const anomaly = parsed.diagnostics.anomalies.find((entry) => entry.type === "risultato_parziale_o_ambiguo");
    assert.ok(anomaly);
    assert.match(anomaly.motivo, item.reason);
    assert.equal(anomaly.giornataLega, 1);
    assert.equal(anomaly.casa, "Casa");
    assert.equal(anomaly.trasferta, "Ospite");
    assert.throws(() => buildUpsertPayload(parsed, { edizioneCompetizioneId: 10 }), /Import bloccato/);
  }
  const corrected = parseCalendarWorkbook(fixture([["1ª Giornata lega", null, "3ª Giornata serie a"], ["Casa", 66.5, 65, "Ospite", "2-2"]]), { resolver, expectedDays: 1 });
  assert.equal(corrected.diagnostics.anomalies.some((entry) => entry.type === "risultato_parziale_o_ambiguo"), false);
  assert.deepEqual(buildUpsertPayload(corrected, { edizioneCompetizioneId: 10 })[0], { edizione_competizione_id: 10, giornata_lega: 1, giornata_serie_a: 3, societa_casa_id: 1, societa_trasferta_id: 2, fantapunti_casa: 66.5, fantapunti_trasferta: 65, gol_casa: 2, gol_trasferta: 2, stato: "calcolata", fonte_importazione: null, import_batch_id: null });
});

test("Coppa completa accetta G1 calcolata e giornate 2-14 completamente vuote", () => {
  const rows = [["Girone di qualificazione"]];
  for (let pair = 0; pair < 7; pair += 1) {
    const odd = pair * 2 + 1; const even = odd + 1;
    rows.push([`${odd}ª Giornata lega`, null, `${odd + 2}ª Giornata serie a`, null, null, null, `${even}ª Giornata lega`, null, `${even + 2}ª Giornata serie a`]);
    for (let index = 0; index < 50; index += 1) rows.push([`Team ${index + 1}`, odd === 1 ? 66.5 : 0, odd === 1 ? 65 : 0, `Team ${index + 51}`, odd === 1 ? "3-1" : "-", null, `Team ${index + 1}`, 0, 0, `Team ${index + 51}`, "-"]);
  }
  const teamResolver = { resolve(name) { const societaId = Number(String(name).replace("Team ", "")); return { input: name, normalized: normalizeSocietaName(name), matches: [{ societaId }], societaId }; } };
  const parsed = parseCalendarWorkbook(fixture(rows), { resolver: teamResolver, calendarType: "calendario_coppa" });
  assert.deepEqual(validateCoppaCalendarStructure(parsed), []);
  assert.equal(parsed.matches.filter((match) => match.stato === "calcolata").length, 50);
  assert.equal(parsed.matches.filter((match) => match.stato === "programmata").length, 650);
  assert.equal(parsed.diagnostics.anomalies.some((entry) => entry.type === "risultato_parziale_o_ambiguo"), false);
});

test("segnala righe incomplete e non crea falsi 0-0", () => {
  const file = fixture([["1ª Giornata lega", null, "1ª Giornata serie a"], [null, 0, 0, "Ospite", "-"]]);
  const parsed = parseCalendarWorkbook(file, { resolver, expectedDays: 1, expectedMatchesPerDay: 1 });
  assert.equal(parsed.matches.length, 0);
  assert.equal(parsed.diagnostics.incompleteRows.length, 1);
  assert.equal(parsed.diagnostics.incompleteDays.length, 1);
});

test("segnala società sconosciute e partite duplicate", () => {
  const unknownResolver = { resolve(name) { return { input: name, normalized: normalizeSocietaName(name), matches: [], societaId: null }; } };
  const file = fixture([
    ["1ª Giornata lega", null, "1ª Giornata serie a"],
    ["Sconosciuta", 0, 0, "Ospite", "-"],
    ["Sconosciuta", 0, 0, "Ospite", "-"],
  ]);
  const parsed = parseCalendarWorkbook(file, { resolver: unknownResolver, expectedDays: 1, expectedMatchesPerDay: 2 });
  assert.deepEqual(parsed.diagnostics.unknownNames, ["Ospite", "Sconosciuta"]);
  assert.equal(parsed.diagnostics.duplicates.length, 1);
});

test("parsa fasi, gironi e riposi senza considerarli righe incomplete", () => {
  const file = fixture([
    ["Europa League"], [], [], ["Fase a Gironi"],
    ["1ª Giornata lega", null, null, "21ª Giornata serie a", null, null, null, "2ª Giornata lega", null, null, "23ª Giornata serie a"],
    ["A", "Casa", 66.5, 65, "Ospite", "1-0", null, "44", "Casa", 0, 0, "Ospite", "-"],
    ["A", "Riposa Ospite", null, null, null, null, null, "44", "Riposa Casa"],
    [], ["Semifinali"], ["3ª Giornata lega", null, null, "30ª Giornata serie a"], [null, "Casa", 70, 68, "Ospite", "2-1"],
  ]);
  const parsed = parseCalendarWorkbook(file, { resolver, expectedDays: 3 });
  assert.equal(parsed.matches.length, 3);
  assert.equal(parsed.rests.length, 2);
  assert.equal(parsed.diagnostics.incompleteRows.length, 0);
  assert.deepEqual(parsed.phases, ["Fase a Gironi", "Semifinali"]);
  assert.equal(parsed.matches[0].girone, "A");
  assert.equal(parsed.matches[1].girone, null);
  assert.equal(parsed.matches[1].raggruppamento, "44");
  assert.deepEqual(parsed.diagnostics.uninterpretableValues, ["44"]);
  assert.equal(parsed.matches[0].giornataLega, 1);
  assert.equal(parsed.matches[0].giornataSerieA, 21);
  const payload = buildRestsUpsertPayload(parsed, { edizioneCompetizioneId: 10 });
  assert.equal(payload.length, 2);
  assert.equal(payload[0].societa_id, 2);
});

test("una vera riga incompleta continua a bloccare i payload", () => {
  const file = fixture([["1ª Giornata lega", null, "1ª Giornata serie a"], ["Casa", 0, 0, null, "-"]]);
  const parsed = parseCalendarWorkbook(file, { resolver, expectedDays: 1 });
  assert.throws(() => buildUpsertPayload(parsed, { edizioneCompetizioneId: 10 }), /Import bloccato/);
  assert.throws(() => buildRestsUpsertPayload(parsed, { edizioneCompetizioneId: 10 }), /Import bloccato/);
});

test("payload e piano upsert non cancellano e distinguono insert/update/identici", () => {
  const parsed = { diagnostics: { ambiguousNames: [], duplicates: [], restDuplicates: [], incompleteRows: [] }, matches: [{ giornataLega: 1, giornataSerieA: 1, casa: { societaId: 1 }, trasferta: { societaId: 2 }, fantapuntiCasa: 66.5, fantapuntiTrasferta: 65, golCasa: 1, golTrasferta: 0, stato: "calcolata" }] };
  const payload = buildUpsertPayload(parsed, { edizioneCompetizioneId: 10, fonteImportazione: "test" });
  const unchanged = classifyUpsertChanges(payload, payload);
  assert.equal(unchanged.unchanged.length, 1);
  const updated = classifyUpsertChanges(payload, [{ ...payload[0], gol_casa: 0 }]);
  assert.equal(updated.update.length, 1);
  const inserted = classifyUpsertChanges(payload, []);
  assert.equal(inserted.insert.length, 1);
  assert.equal(Object.hasOwn(inserted, "delete"), false);
});

function validCoppa() {
  const days = Array.from({ length: 14 }, (_, index) => index + 1);
  const matches = days.flatMap((day) => Array.from({ length: 50 }, (_, index) => {
    const homeId = index + 1; const awayId = index + 51;
    return { giornataLega: day, source: { row: day * 100 + index }, casa: { name: `Società ${homeId}`, normalized: `societa${homeId}`, societaId: homeId }, trasferta: { name: `Società ${awayId}`, normalized: `societa${awayId}`, societaId: awayId } };
  }));
  return { days, matches };
}

test("valida i campionati a 38 giornate, 10 partite e 20 società", () => {
  const days = Array.from({ length: 38 }, (_, index) => index + 1);
  const matches = days.flatMap((giornataLega) => Array.from({ length: 10 }, (_, index) => ({ giornataLega, casa: { societaId: index + 1 }, trasferta: { societaId: index + 11 } })));
  assert.deepEqual(validateCampionatoCalendarStructure({ days, matches }), []);
  assert.ok(validateCampionatoCalendarStructure({ days, matches: matches.slice(0, -1) }).some((issue) => issue.codice === "CAMPIONATO_PARTITE_TOTALI"));
});

test("valida il calendario Coppa ufficiale 14x50 con 100 società", () => {
  assert.deepEqual(validateCoppaCalendarStructure(validCoppa()), []);
});

test("rifiuta numero giornate, range e conteggi Coppa errati", () => {
  const thirteen = validCoppa(); thirteen.days.pop(); thirteen.matches = thirteen.matches.filter((match) => match.giornataLega <= 13);
  assert.ok(validateCoppaCalendarStructure(thirteen).some((issue) => issue.codice === "COPPA_NUMERO_GIORNATE"));
  const fifteen = validCoppa(); fifteen.days.push(15); fifteen.matches.push(...fifteen.matches.slice(0, 50).map((match) => ({ ...match, giornataLega: 15 })));
  assert.ok(validateCoppaCalendarStructure(fifteen).some((issue) => issue.codice === "COPPA_GIORNATA_FUORI_RANGE"));
  const fortyNine = validCoppa(); fortyNine.matches.splice(0, 1);
  assert.ok(validateCoppaCalendarStructure(fortyNine).some((issue) => issue.messaggio === "Giornata 1: previste 50 partite, trovate 49."));
  const fiftyOne = validCoppa(); fiftyOne.matches.push({ ...fiftyOne.matches[0], source: { row: 9999 } });
  assert.ok(validateCoppaCalendarStructure(fiftyOne).some((issue) => issue.messaggio === "Giornata 1: previste 50 partite, trovate 51."));
});

test("rifiuta duplicati, assenze, autopartite e società sconosciute prima del write", () => {
  const duplicated = validCoppa(); duplicated.matches[1] = { ...duplicated.matches[0], source: { row: 2 } };
  const duplicateIssues = validateCoppaCalendarStructure(duplicated);
  assert.ok(duplicateIssues.some((issue) => issue.codice === "COPPA_PARTITA_DUPLICATA"));
  assert.ok(duplicateIssues.some((issue) => issue.codice === "COPPA_SOCIETA_DUPLICATA_GIORNATA"));
  assert.ok(duplicateIssues.some((issue) => issue.codice === "COPPA_PARTECIPANTI_GIORNATA"));
  const self = validCoppa(); self.matches[0] = { ...self.matches[0], trasferta: self.matches[0].casa };
  assert.ok(validateCoppaCalendarStructure(self).some((issue) => issue.codice === "COPPA_AUTOPARTITA"));
  const unresolved = validCoppa(); unresolved.matches[0] = { ...unresolved.matches[0], casa: { ...unresolved.matches[0].casa, societaId: null } };
  assert.ok(validateCoppaCalendarStructure(unresolved).some((issue) => issue.codice === "COPPA_PARTECIPANTI_GIORNATA"));
});
