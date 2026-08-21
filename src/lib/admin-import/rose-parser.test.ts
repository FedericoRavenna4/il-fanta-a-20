import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as XLSX from "xlsx";
import { buildLegacyRoseBackfill } from "../../../scripts/prepare-legacy-rose-backfill.mjs";
import { diffRoseSnapshot, parseRoseBuffer, type ExistingRoseRow } from "./rose-parser.ts";

const teams = new Map([["societa a", 1], ["societa b", 2]]);
const resolver = { resolve(name: string) { const key = name.toLowerCase().trim().replace(/\s+/g, " "); return key === "ambigua" ? { societaId: null, legaCodice: null, ambiguous: true } : { societaId: teams.get(key) ?? null, legaCodice: teams.has(key) ? "serie-a" : null }; } };
const columns = ["Squadra", "Nome", "Squadra_Appartenenza", "Ruolo", "Ruoli_Mantra", "Prezzo", "Quotazione", "Quotazione_Mantra", "Fantacalcio_Id"];
const rows = [["Societa A", "Lautaro", "Inter", "A", "Pc", 50, "", "", ""], ["Societa A", "Barella", "Inter", "C", "M/C", "12,5", "", "", ""]];
function file(kind: "csv" | "xlsx", values = rows) { const sheet = XLSX.utils.aoa_to_sheet([columns, ...values]); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Rose"); return new Uint8Array(XLSX.write(book, { type: "array", bookType: kind === "csv" ? "csv" : "xlsx" })); }

for (const kind of ["csv", "xlsx"] as const) test(`${kind.toUpperCase()} usa solo le cinque colonne autorizzate`, () => { const parsed = parseRoseBuffer(file(kind), resolver); assert.equal(parsed.errors.length, 0); assert.equal(parsed.rows.length, 2); assert.equal(parsed.rows[0].ruolo, "A"); assert.equal(parsed.rows[0].prezzo, 50); assert.equal(parsed.rows[1].prezzo, 12.5); });
test("colonne extra assenti e squadra reale vuota sono valide", () => { const sheet = XLSX.utils.aoa_to_sheet([["Squadra","Nome","Ruolo","Prezzo"],["Societa A","Sommer","P",1]]); const book=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,sheet,"Rose"); const parsed=parseRoseBuffer(new Uint8Array(XLSX.write(book,{type:"array",bookType:"xlsx"})),resolver); assert.equal(parsed.errors.length,0); assert.equal(parsed.rows[0].squadraReale,null); });
test("blocca società sconosciuta ambigua duplicati e prezzi non validi", () => { const parsed=parseRoseBuffer(file("xlsx",[["Ignoto","Uno","", "P","",1,"","",""],["Ambigua","Due","","D","",2,"","",""],["Societa A","Tre","","C","", "x","","",""],["Societa A","Lautaro","","A","",4,"","",""],["Societa B","Lautaro","","A","",5,"","",""]]),resolver); for(const code of ["SOCIETA_NON_RICONOSCIUTA","SOCIETA_AMBIGUA","PREZZO_NON_VALIDO","CALCIATORE_DUPLICATO"]) assert.ok(parsed.errors.some((error)=>error.code===code)); });
test("snapshot identico dieci volte non crea righe extra", () => { let state: ExistingRoseRow[] = []; for(let index=0;index<10;index++){ const parsed=parseRoseBuffer(file("xlsx"),resolver); const diff=diffRoseSnapshot(parsed.rows,state); if(index===0) assert.equal(diff.insert,2); else assert.deepEqual(diff,{insert:0,update:0,transfer:0,unchanged:2,remove:0}); state=parsed.rows.map((row)=>({lega_codice:row.legaCodice,societa_id:row.societaId,giocatore:row.giocatore,giocatore_normalizzato:row.giocatoreNormalizzato,squadra_reale:row.squadraReale,ruolo:row.ruolo,prezzo:row.prezzo})); } assert.equal(state.length,2); });
test("diff riconosce modifica aggiunta rimozione e trasferimento", () => { const existing=[{lega_codice:"serie-a",societa_id:1,giocatore:"Lautaro",giocatore_normalizzato:"lautaro",squadra_reale:"Inter",ruolo:"A",prezzo:50},{lega_codice:"serie-a",societa_id:1,giocatore:"Sommer",giocatore_normalizzato:"sommer",squadra_reale:"Inter",ruolo:"P",prezzo:1}]; const incoming=parseRoseBuffer(file("xlsx",[["Societa B","Lautaro","Inter","A","",55,"","",""],["Societa A","Barella","Inter","C","",12,"","",""]]),resolver).rows; assert.deepEqual(diffRoseSnapshot(incoming,existing),{insert:1,update:1,transfer:1,unchanged:0,remove:1}); });

test("prezzo ruolo e squadra reale modificati sono aggiornamenti", () => {
  const existing: ExistingRoseRow[] = [{ lega_codice: "serie-a", societa_id: 1, giocatore: "Lautaro", giocatore_normalizzato: "lautaro", squadra_reale: "Inter", ruolo: "A", prezzo: 50 }];
  const variants = [
    ["Societa A", "Lautaro", "Inter", "A", "", 51, "", "", ""],
    ["Societa A", "Lautaro", "Inter", "C", "", 50, "", "", ""],
    ["Societa A", "Lautaro", "Milan", "A", "", 50, "", "", ""],
  ];
  for (const variant of variants) {
    assert.deepEqual(diffRoseSnapshot(parseRoseBuffer(file("xlsx", [variant]), resolver).rows, existing), { insert: 0, update: 1, transfer: 0, unchanged: 0, remove: 0 });
  }
});

test("blocca file vuoto struttura incompatibile nome e ruolo mancanti", () => {
  const invalidRows = parseRoseBuffer(file("xlsx", [
    ["Societa A", "", "Inter", "A", "", 1, "", "", ""],
    ["Societa A", "Lautaro", "Inter", "", "", 1, "", "", ""],
  ]), resolver);
  assert.ok(invalidRows.errors.some((error) => error.code === "NOME_MANCANTE"));
  assert.ok(invalidRows.errors.some((error) => error.code === "RUOLO_NON_VALIDO"));

  const empty = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(empty, XLSX.utils.aoa_to_sheet([columns]), "Rose");
  assert.ok(parseRoseBuffer(new Uint8Array(XLSX.write(empty, { type: "array", bookType: "xlsx" })), resolver).errors.length > 0);

  const incompatible = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(incompatible, XLSX.utils.aoa_to_sheet([["Altro"], ["dato"]]), "Rose");
  assert.ok(parseRoseBuffer(new Uint8Array(XLSX.write(incompatible, { type: "array", bookType: "xlsx" })), resolver).errors.some((error) => error.code === "COLONNA_MANCANTE"));
});

test("CSV UTF-8 con e senza BOM e XLSX preservano Unicode fino al runtime", () => {
  const names = ["Lucum\u00ed", "Zieli\u0144ski", "Nicol\u00f2", "Andr\u00e9", "Jo\u00e3o", "D'Onofrio"];
  const unicodeRows = names.map((name, index) => ["Societa A", name, `Squadra ${index}`, "A", "", 1, "", "", ""]);
  const csvText = `${columns.join(",")}\r\n${unicodeRows.map((row) => row.join(",")).join("\r\n")}`;
  const utf8 = new TextEncoder().encode(csvText);
  const inputs = [utf8, new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]), file("xlsx", unicodeRows)];

  for (const input of inputs) {
    const parsed = parseRoseBuffer(input, resolver);
    assert.equal(parsed.errors.length, 0);
    const preview = parsed.rows.map((row) => ({ giocatore: row.giocatore, squadraReale: row.squadraReale }));
    const payload = parsed.rows.map((row) => ({ giocatore: row.giocatore, squadra_reale: row.squadraReale }));
    const runtime = payload.map((row) => ({ giocatore: row.giocatore, squadraReale: row.squadra_reale }));
    assert.deepEqual(preview.map((row) => row.giocatore), names);
    assert.deepEqual(runtime.map((row) => row.giocatore), names);
    assert.deepEqual(runtime.map((row) => row.squadraReale), names.map((_, index) => `Squadra ${index}`));
  }
});

test("file normale senza Lega deriva scope autorevoli e blocca più leghe", () => {
  const leagueResolver = {
    resolve(name: string) {
      if (name === "Societa A") return { societaId: 1, legaCodice: "serie-a" };
      if (name === "Societa B") return { societaId: 2, legaCodice: "serie-b" };
      return { societaId: null, legaCodice: null };
    },
  };
  const parsed = parseRoseBuffer(file("xlsx", [
    ["Societa A", "Lautaro", "Inter", "A", "", 50, "", "", ""],
    ["Societa B", "Lautaro", "Inter", "A", "", 45, "", "", ""],
  ]), leagueResolver);
  assert.equal(columns.includes("Lega"), false);
  assert.ok(parsed.errors.some((error) => error.code === "LEGA_MULTIPLA"));
  assert.deepEqual(parsed.rows.map((row) => row.legaCodice), ["serie-a", "serie-b"]);
});

test("snapshot Rose blocca società appartenenti a leghe diverse", () => {
  const scopedResolver = {
    resolve(name: string) {
      if (name === "Societa A") return { societaId: 1, legaCodice: "serie-a" };
      if (name === "Societa B") return { societaId: 2, legaCodice: "serie-b" };
      return { societaId: null, legaCodice: null };
    },
    expectedSocietaIds(code: string) { return code === "serie-a" ? [1] : [2]; },
  };
  const parsed = parseRoseBuffer(file("xlsx", [
    ["Societa A", "Lautaro", "Inter", "A", "", 50, "", "", ""],
    ["Societa B", "Barella", "Inter", "C", "", 30, "", "", ""],
  ]), scopedResolver);
  assert.equal(parsed.targetLeagueCode, null);
  assert.ok(parsed.errors.some((error) => error.code === "LEGA_MULTIPLA"));
});

test("snapshot Rose blocca 19 società quando la lega autorevole ne contiene 20", () => {
  const expectedIds = Array.from({ length: 20 }, (_, index) => index + 1);
  const scopedResolver = {
    resolve(name: string) {
      const id = Number(name.replace("Societa ", ""));
      return { societaId: Number.isSafeInteger(id) ? id : null, legaCodice: "serie-a" };
    },
    expectedSocietaIds() { return expectedIds; },
  };
  const rows = expectedIds.slice(0, 19).map((id) => [`Societa ${id}`, `Player ${id}`, "ITA", "C", "", 1, "", "", ""]);
  const parsed = parseRoseBuffer(file("xlsx", rows), scopedResolver);
  assert.equal(parsed.targetLeagueCode, "serie-a");
  assert.ok(parsed.errors.some((error) => error.code === "SNAPSHOT_LEGA_INCOMPLETO" && error.message.includes("20 società, presenti 19")));
});

test("diff per lega copre identico, prezzo, sostituzione e preserva le altre leghe", () => {
  const serieA: ExistingRoseRow[] = Array.from({ length: 420 }, (_, index) => ({
    lega_codice: "serie-a", societa_id: (index % 20) + 1, giocatore: `Player ${index}`,
    giocatore_normalizzato: `player ${index}`, squadra_reale: "ITA", ruolo: "C", prezzo: 1,
  }));
  const serieC: ExistingRoseRow[] = Array.from({ length: 420 }, (_, index) => ({
    ...serieA[index], lega_codice: "serie-c-girone-a", societa_id: 41 + (index % 20),
  }));
  const incoming = serieA.map((row, index) => ({
    row: index + 2, legaCodice: row.lega_codice, societaId: row.societa_id, societa: `Societa ${row.societa_id}`,
    giocatore: row.giocatore, giocatoreNormalizzato: row.giocatore_normalizzato,
    squadraReale: row.squadra_reale, ruolo: row.ruolo, prezzo: row.prezzo,
  }));
  assert.deepEqual(diffRoseSnapshot(incoming, serieA), { insert: 0, update: 0, transfer: 0, unchanged: 420, remove: 0 });
  const priceChanged = incoming.map((row, index) => index === 0 ? { ...row, prezzo: 2 } : row);
  assert.deepEqual(diffRoseSnapshot(priceChanged, serieA), { insert: 0, update: 1, transfer: 0, unchanged: 419, remove: 0 });
  const replaced = incoming.map((row, index) => index === 0 ? { ...row, giocatore: "Replacement", giocatoreNormalizzato: "replacement" } : row);
  assert.deepEqual(diffRoseSnapshot(replaced, serieA), { insert: 1, update: 0, transfer: 0, unchanged: 419, remove: 1 });
  assert.equal(serieC.length, 420);
  assert.ok(serieC.every((row) => row.lega_codice === "serie-c-girone-a"));
});

test("stesso giocatore due volte nella stessa lega e mismatch tecnico società-lega sono bloccati", () => {
  const duplicate = parseRoseBuffer(file("xlsx", [
    ["Societa A", "Lautaro", "Inter", "A", "", 50, "", "", ""],
    ["Societa B", "Lautaro", "Inter", "A", "", 45, "", "", ""],
  ]), resolver);
  assert.ok(duplicate.errors.some((error) => error.code === "CALCIATORE_DUPLICATO"));

  const technical = new TextEncoder().encode("Stagione,Lega,Squadra_ID,Ruolo,Giocatore,Squadra_Reale,Costo\r\n2025/26,serie-b,1,A,Lautaro,Inter,50");
  const mismatch = parseRoseBuffer(technical, { resolve: () => ({ societaId: null }), resolveId: () => ({ societaId: 1, legaCodice: "serie-a" }) }, "2025/26");
  assert.ok(mismatch.errors.some((error) => error.code === "SOCIETA_LEGA_NON_COHERENTE"));
});

test("CSV non UTF-8 viene rifiutato senza correzioni arbitrarie", () => {
  const windows1252 = Uint8Array.from([...
    new TextEncoder().encode("Squadra,Nome,Squadra_Appartenenza,Ruolo,Prezzo\r\nSocieta A,Lucum"),
    0xed,
    ...new TextEncoder().encode(",Lecce,A,1"),
  ]);
  assert.throws(() => parseRoseBuffer(windows1252, resolver), /non è UTF-8 valido/);
});

test("reimport corretto sostituisce una chiave mojibake tramite semantica snapshot", () => {
  const correct = parseRoseBuffer(new TextEncoder().encode("Squadra,Nome,Squadra_Appartenenza,Ruolo,Prezzo\r\nSocieta A,Lucum\u00ed,Lecce,D,10"), resolver).rows;
  const corrupted: ExistingRoseRow[] = [{ lega_codice: "serie-a", societa_id: 1, giocatore: "Lucum\u00c3\u00ad", giocatore_normalizzato: "lucuma", squadra_reale: "Lecce", ruolo: "D", prezzo: 10 }];
  assert.deepEqual(diffRoseSnapshot(correct, corrupted), { insert: 1, update: 0, transfer: 0, unchanged: 0, remove: 1 });
});

test("snapshot legacy 2025/26 usa ID autorevoli, ignora slot vuoti e non tocca altre stagioni", () => {
  const source = new Uint8Array(readFileSync("data/rose.csv"));
  const legacy = buildLegacyRoseBackfill(source, new Uint8Array(readFileSync("data/risultati.csv")), "2025/26", 3);
  const legacyResolver = {
    resolve() { return { societaId: null }; },
    resolveId(id: number) { return { societaId: id >= 1 && id <= 100 ? id : null, legaCodice: legacy.memberships.get(id) ?? null }; },
  };
  const parsed = parseRoseBuffer(legacy.bytes, legacyResolver, "2025/26");
  assert.ok(parsed.errors.some((error) => error.code === "LEGA_MULTIPLA"));
  assert.equal(parsed.rows.length, 1975);
  assert.equal(new Set(parsed.rows.map((row) => row.societaId)).size, 83);
  assert.equal(legacy.memberships.size, 100);
  assert.equal(parsed.rows.filter((row) => !row.squadraReale).length, 0);

  const current2026 = [{ stagione: "2026/27", societaId: 16, giocatore: "Corrente" }];
  const historical = parsed.rows.filter((row) => row.societaId === 16).map((row) => ({ stagione: "2025/26", societaId: row.societaId, giocatore: row.giocatore }));
  const combined = [...historical, ...current2026];
  assert.equal(combined.filter((row) => row.stagione === "2025/26").length, 24);
  assert.equal(combined.filter((row) => row.stagione === "2026/27").length, 1);
  assert.ok(parseRoseBuffer(legacy.bytes, legacyResolver, "2026/27").errors.some((error) => error.code === "STAGIONE_NON_COHERENTE"));
  assert.ok(parseRoseBuffer(source, legacyResolver, "2025/26").errors.some((error) => error.code === "COLONNA_MANCANTE"));
});

test("preview 456 default coincide con publish scoped e rimuove ogni default", () => {
  const existing: ExistingRoseRow[] = Array.from({ length: 456 }, (_, index) => ({
    lega_codice: "default", societa_id: (index % 20) + 1, giocatore: `Player ${index}`,
    giocatore_normalizzato: `player ${index}`, squadra_reale: "ITA", ruolo: "C", prezzo: 1,
  }));
  const incoming = existing.map((row, index) => ({
    row: index + 2, legaCodice: index < 388 ? "serie-a" : "serie-b", societaId: row.societa_id,
    societa: `Societa ${row.societa_id}`, giocatore: row.giocatore,
    giocatoreNormalizzato: row.giocatore_normalizzato, squadraReale: row.squadra_reale,
    ruolo: row.ruolo, prezzo: row.prezzo,
  }));
  assert.deepEqual(diffRoseSnapshot(incoming, existing), { insert: 456, update: 0, transfer: 0, unchanged: 0, remove: 456 });
  const published = incoming.map((row) => ({ league: row.legaCodice, player: row.giocatoreNormalizzato }));
  assert.equal(published.length, 456);
  assert.equal(published.filter((row) => row.league === "default").length, 0);
  assert.equal(new Set(published.map((row) => `${row.league}:${row.player}`)).size, 456);
});
