import assert from "node:assert/strict";
import test from "node:test";
import { mapLineupSaveError, reportLineupSaveFailure, resolveLineupSaveFailure } from "./save-errors.ts";

const context = { seasonId: 4, matchday: 9, matchId: 77, societyIds: [7, 1] };
const cases = [
  ["FANTABET_LINEUPS_SCOPE_INVALIDO", "SCOPE_INVALID"], ["FANTABET_LINEUPS_INVALIDE", "LINEUPS_INVALID"], ["FANTABET_TITOLARI_INVALIDI", "PLAYERS_INVALID"], ["FANTABET_LINEUPS_PARTITA_FUORI_SCOPE", "MATCH_OUT_OF_SCOPE"], ["FANTABET_LINEUPS_PARTITA_NON_SELEZIONATA", "MATCH_NOT_SELECTED"],
] as const;
test("mappa chiaramente gli errori DB Formazioni", () => { for (const [code, category] of cases) assert.equal(mapLineupSaveError({ message: code }).category, category); });
test("errore RPC genera un log server strutturato", () => { const calls: unknown[][] = []; const original = console.error; console.error = (...args: unknown[]) => { calls.push(args); }; try { reportLineupSaveFailure({ code: "P0001", message: "FANTABET_TITOLARI_INVALIDI", details: "detail", hint: "hint" }, context); } finally { console.error = original; } assert.equal(calls.length, 1); assert.equal(calls[0][0], "[fantabet-lineups:save]"); assert.deepEqual(calls[0][1], { code: "P0001", message: "FANTABET_TITOLARI_INVALIDI", details: "detail", hint: "hint", category: "PLAYERS_INVALID", stagione: 4, giornata: 9, matchId: 77, societa_ids: [7, 1] }); });
test("logger usa una allowlist e scarta dati sensibili estranei", () => { const calls: unknown[][] = []; const original = console.error; const unsafeError = { message: "errore", access_token: "secret", email: "admin@example.test", screenshot: "base64" }; console.error = (...args: unknown[]) => { calls.push(args); }; try { reportLineupSaveFailure(unsafeError, context); } finally { console.error = original; } const serialized = JSON.stringify(calls); assert.doesNotMatch(serialized, /secret|admin@example|base64|access_token|email|screenshot/); });
test("il percorso di successo non invoca il logger", () => { const calls: unknown[][] = []; const original = console.error; console.error = (...args: unknown[]) => { calls.push(args); }; try { assert.equal(resolveLineupSaveFailure(true, null, context), null); } finally { console.error = original; } assert.equal(calls.length, 0); });
