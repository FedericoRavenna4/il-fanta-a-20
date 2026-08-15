import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/202608150001_societa_support_emblems.sql", import.meta.url), "utf8");
const tifoKeys = ["primo_tifoso", "la_curva_cresce", "un_popolo", "sold_out"];
const competitiveKeys = ["prima_inviolata", "prima_goleada", "primi_passi", "primo_punto", "manita", "schiacciasassi", "bestia_nera"];

test("upgrade parte dalle tabelle esistenti senza ricreare o distruggere dati", () => {
  assert.doesNotMatch(migration, /create table|drop table|truncate/i);
  assert.doesNotMatch(migration, /delete from public\.societa_emblem_|update public\.societa_emblem_unlocks/i);
  assert.match(migration.trimStart(), /^begin;/i);
  assert.match(migration.trimEnd(), /commit;$/i);
});

test("sostituisce soltanto il CHECK noto con gli undici valori approvati", () => {
  assert.match(migration, /drop constraint societa_emblem_unlocks_emblem_key_check/i);
  assert.match(migration, /add constraint societa_emblem_unlocks_emblem_key_check check/i);
  for (const key of [...tifoKeys, ...competitiveKeys]) assert.match(migration, new RegExp(`'${key}'`));
  const checkBlock = migration.match(/add constraint societa_emblem_unlocks_emblem_key_check check[\s\S]*?\);/i)?.[0] ?? "";
  assert.equal((checkBlock.match(/'[^']+'/g) ?? []).length, 11);
});

test("dati Tifo e holder Idolo preesistenti sopravvivono all'upgrade", () => {
  assert.doesNotMatch(migration, /(?:delete|update) from public\.societa_emblem_holder_history/i);
  assert.doesNotMatch(migration, /drop constraint societa_emblem_holder_history/i);
  assert.doesNotMatch(migration, /create table public\.societa_emblem_holder_history/i);
});

test("preserva i quattro trigger Tifo e aggiunge una sola volta quello partite", () => {
  for (const trigger of ["support_insert", "profile_official_change", "support_ineligibility", "active_season_change"]) {
    assert.doesNotMatch(migration, new RegExp(`create trigger societa_emblems_after_${trigger}`, "i"));
  }
  assert.equal((migration.match(/create trigger societa_emblems_after_match_evaluation/gi) ?? []).length, 1);
});

test("replace della sync conserva Tifo e Idolo e aggiunge i sette competitivi", () => {
  assert.match(migration, /create or replace function private\.sync_societa_support_emblems\(\)/i);
  for (const key of tifoKeys) assert.match(migration, new RegExp(`'${key}'`));
  for (const key of competitiveKeys) assert.match(migration, new RegExp(`'${key}'`));
  assert.match(migration, /if v_holder_tifosi = v_max_tifosi then return/);
  assert.match(migration, /v_leader_count = 1 and v_max_tifosi > v_holder_tifosi/);
});

test("backfill ripetuto non duplica unlock e non sostituisce la RPC pubblica", () => {
  assert.match(migration, /on conflict \(societa_id, emblem_key\) do nothing/g);
  assert.equal((migration.match(/select private\.sync_societa_support_emblems\(\);/g) ?? []).length, 1);
  assert.doesNotMatch(migration, /create or replace function public\.public_societa_support_emblems/i);
});
