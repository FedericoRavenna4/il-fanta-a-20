import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import XLSX from "xlsx";
import { buildRestsUpsertPayload, buildUpsertPayload, classifyUpsertChanges, normalizeSocietaName, parseCalendarWorkbook, parseGoalResult } from "./lib/calendar-import.mjs";

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
