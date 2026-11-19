import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAllAdminMatches } from "./admin-matches.ts";

test("paginazione completa anche con limite remoto inferiore a 1000", async () => {
  const leagues = ["Serie A", "Serie B", "Serie C Girone A", "Serie C Girone B", "Serie C Girone C"];
  const rows = Array.from({ length: 1900 }, (_, i) => ({ id: i + 1, stagioneId: 4, giornata: Math.floor(i / 50) + 1, league: leagues[Math.floor(i / 10) % 5], stato: "programmata" }));
  const loaded = await loadAllAdminMatches(async (afterId) => ({ data: rows.filter((row) => row.id > afterId).slice(0, 137), error: null }));
  assert.deepEqual(loaded, rows);
  for (const day of [9, 10, 11, 12, 20, 38]) for (const league of leagues) {
    const selected = loaded.filter((row) => row.stagioneId === 4 && row.giornata === day && row.league === league);
    assert.equal(selected.length, 10);
    assert.ok(selected.every((row) => row.stato === "programmata" && row.giornata === day && row.league === league));
  }
});

test("un errore anche dopo una pagina non diventa un calendario vuoto o parziale", async () => {
  await assert.rejects(loadAllAdminMatches(async (id) => id ? { data: null, error: new Error("offline") } : { data: [{ id: 1 }], error: null }), /Impossibile caricare le partite/);
  await assert.rejects(loadAllAdminMatches(async () => ({ data: [{ id: 1 }], error: null })), /paginazione non valida/);
});

test("query e UI mantengono isolamento, selezione futura e schedine", async () => {
  const server = await readFile(new URL("./admin.server.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../../app/admin/fantabet/AdminFantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(server, /\.in\("edizione_competizione_id", editionIds\)\.gt\("id", afterId\)\.order\("id"\)/);
  assert.match(client, /match\.stagioneId === initial\.season\.id && match\.giornata === day && match\.league === league/);
  assert.match(client, /matches\.map\(\(match\) => <MatchChoice/);
  assert.match(server, /roundBets\.map\(\(bet\)/);
});
