import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/202608150001_societa_support_emblems.sql", import.meta.url), "utf8");
const catalog = await readFile(new URL("../data/emblemi.csv", import.meta.url), "utf8");
const automatic = {
  primi_passi: (gf, ga) => gf > ga,
  primo_punto: (gf, ga) => gf === ga,
  prima_inviolata: (_gf, ga) => ga === 0,
  prima_goleada: (gf) => gf >= 4,
  manita: (gf) => gf >= 5,
  schiacciasassi: (gf, ga) => gf - ga >= 4,
};

test("catalogo competitivo è inventariato senza cambiare le descrizioni", () => { for (const name of ["primi passi","primo punto","prima inviolata","prima goleada","manita","schiacciasassi","bestia nera"]) assert.ok(catalog.toLowerCase().includes(name)); });
for (const [key, condition] of Object.entries(automatic)) test(`${key}: soglia negativa positiva e sync unica`, () => { const cases = { primi_passi:[[1,1],[2,1]], primo_punto:[[1,0],[1,1]], prima_inviolata:[[1,1],[1,0]], prima_goleada:[[3,0],[4,0]], manita:[[4,0],[5,0]], schiacciasassi:[[4,1],[5,1]] }[key]; assert.equal(condition(...cases[0]),false); assert.equal(condition(...cases[1]),true); assert.match(migration,new RegExp(`'${key}'`)); assert.match(migration,/on conflict \(societa_id, emblem_key\) do nothing/); });
test("bestia nera richiede due vittorie contro lo stesso avversario nello stesso campionato", () => { assert.match(migration,/competition\.tipo = 'campionato'/); assert.match(migration,/group by performance\.societa_id, performance\.edizione_competizione_id, performance\.opponent_id/); assert.match(migration,/having count\(\*\) >= 2/); });
test("sync è collegata a insert update risultato ed è database-controlled", () => { assert.match(migration,/societa_emblems_after_match_evaluation[\s\S]*after insert or update of stato, gol_casa, gol_trasferta on public\.partite/); assert.match(migration,/security definer[\s\S]*set search_path = ''/); assert.match(migration,/revoke all on function private\.sync_societa_support_emblems\(\) from public, anon, authenticated/); });
test("permanenti restano persistiti durante un ricalcolo e il backfill è idempotente", () => { assert.doesNotMatch(migration,/delete from public\.societa_emblem_unlocks/); assert.match(migration,/on conflict \(societa_id, emblem_key\) do nothing/); assert.match(migration,/select private\.sync_societa_support_emblems\(\)/); });
test("condizioni non determinabili non vengono inventate nella sync", () => { for(const key of ["primo_scambio","eroico","talent_scout","rosa_perfetta","mercante","mecenate"]) assert.doesNotMatch(migration,new RegExp(`'${key}'`)); });
