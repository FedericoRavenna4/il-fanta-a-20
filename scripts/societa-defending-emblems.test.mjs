import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/202608160001_dynamic_defending_societa_emblems.sql", import.meta.url), "utf8");
const loader = await readFile(new URL("../src/lib/account/support.server.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../src/app/societa/[slug]/page.tsx", import.meta.url), "utf8");
const catalogPage = await readFile(new URL("../src/app/emblemi/page.tsx", import.meta.url), "utf8");

function transfer(current, candidate, lowerIsBetter = false) {
  const better = lowerIsBetter ? candidate.value < current.value : candidate.value > current.value;
  return better ? candidate : current;
}

test("Titano e Abisso preservano esattamente incumbent e record approvati", () => {
  assert.match(migration, /'titano'::text, 10::bigint, 94::numeric/);
  assert.match(migration, /'abisso'::text, 5::bigint, 31::numeric/);
  assert.match(migration, /Existing calculated[\s\S]*not backfilled for Titano or Abisso/);
});

test("Titano e Abisso cambiano holder soltanto con un record strettamente migliore", () => {
  const titano = { holder: 10, value: 94 };
  assert.deepEqual(transfer(titano, { holder: 20, value: 94.5 }), { holder: 20, value: 94.5 });
  assert.deepEqual(transfer(titano, { holder: 20, value: 94 }), titano);
  const abisso = { holder: 5, value: 31 };
  assert.deepEqual(transfer(abisso, { holder: 20, value: 30.5 }, true), { holder: 20, value: 30.5 });
  assert.deepEqual(transfer(abisso, { holder: 20, value: 31 }, true), abisso);
  assert.match(migration, /p_record_value < v_record_value/);
  assert.match(migration, /p_record_value > v_record_value/);
  assert.doesNotMatch(migration, /p_emblem_key = 'abisso'[\s\S]*p_record_value = v_record_value/);
});

test("Mecenate deriva il massimo prezzo Rose e cambia soltanto con leader unico superiore", () => {
  assert.match(migration, /select max\(player\.prezzo\)/);
  assert.match(migration, /v_leader_count <> 1/);
  assert.match(migration, /v_max_value <= v_holder_value/);
  assert.match(migration, /after insert or delete or update of prezzo, societa_id/);
});

test("record dinamici usano holder history e Idolo espone solo il numero autorevole", () => {
  assert.match(migration, /add column if not exists record_value numeric/);
  assert.match(migration, /holder\.emblem_key = 'idolo'[\s\S]*supporters\.tifosi/);
  assert.match(loader, /public_societa_defending_emblems/);
  assert.match(loader, /record: String\(Number\(row\.record_value\)\)/);
  assert.doesNotMatch(loader + page, /record: `Tifosi:/);
});

test("UI rimuove i quattro holder statici quando il contratto dinamico è disponibile", () => {
  assert.match(page, /dynamicDefendingKeys = new Set\(\["titano", "abisso", "mecenate", "idolo"\]\)/);
  assert.match(page, /defendingEmblems === null[\s\S]*legacySupportEmblemsWithRecords/);
  assert.match(page, /!dynamicDefendingKeys\.has\(emblema\.chiave\)/);
  assert.match(catalogPage, /getAllSocietaDefendingEmblems/);
  assert.match(catalogPage, /record: dynamic\?\.record \?\? emblema\.record/);
  assert.match(catalogPage, /defendingEmblems !== null && dynamicDefendingKeys\.has/);
});

test("funzioni trusted non sono eseguibili da anon o authenticated", () => {
  for (const signature of [
    "private.register_societa_performance_record",
    "private.track_societa_match_records",
    "private.sync_societa_mecenate",
    "private.trigger_sync_societa_mecenate",
  ]) assert.match(migration, new RegExp(`revoke all on function ${signature.replaceAll(".", "\\.")}\\(`));
  assert.match(migration, /grant execute on function public\.public_societa_defending_emblems\(bigint\) to anon, authenticated, service_role/);
});
