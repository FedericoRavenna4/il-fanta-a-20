import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const migration = read("supabase", "migrations", "202608100005_user_emblems.sql");
const profile = read("src", "app", "user", "[username]", "page.tsx");
const ui = read("src", "app", "user", "[username]", "ProfileEmblems.tsx");
const rows = [...migration.matchAll(/\((\d+), '([a-z0-9-]+)', '[^']+', '(comune|raro|epico|leggendario)', '(fantabet|tifo|arcade|fedelta)', '[^']+', '(\/emblemi-utenti\/[a-z0-9-]+\.png)', (true|false), (\d+)\)/g)];

test("catalogo contiene 20 emblemi ordinati, univoci e con asset reali", () => {
  assert.equal(rows.length, 20);
  assert.equal(new Set(rows.map((row) => row[2])).size, 20);
  assert.deepEqual(rows.map((row) => Number(row[7])), Array.from({ length: 20 }, (_, index) => index + 1));
  for (const row of rows) assert.equal(existsSync(new URL(`../public${row[5]}`, import.meta.url)), true, row[5]);
});

test("rarità, categorie e quattro segreti sono vincolati", () => {
  assert.deepEqual(new Set(rows.map((row) => row[3])), new Set(["comune", "raro", "epico", "leggendario"]));
  assert.deepEqual(new Set(rows.map((row) => row[4])), new Set(["fantabet", "tifo", "arcade", "fedelta"]));
  assert.deepEqual(rows.filter((row) => row[6] === "true").map((row) => row[2]), ["salto-di-qualita", "sull-onda-dell-entusiasmo", "veterano", "fedelta-eterna"]);
});

test("unlock è unico, idempotente, persistente e non scrivibile dal client", () => {
  assert.match(migration, /primary key \(profile_id, emblem_id\)/);
  assert.match(migration, /on conflict do nothing/g);
  assert.doesNotMatch(migration, /delete from public\.user_emblem_unlocks/);
  assert.match(migration, /revoke all on public\.user_emblems, public\.user_emblem_unlocks from public, anon, authenticated/);
  assert.match(migration, /user_emblem_unlocks_read_own[\s\S]*profile_id = auth\.uid\(\)/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*authenticated/);
});

test("profilo pubblico riceve catalogo redatto e non espone segreti bloccati", () => {
  assert.match(migration, /public_profile_user_emblems/);
  assert.match(migration, /then '\?\?\?'/);
  assert.match(migration, /then null else emblem\.asset_path/);
  assert.match(migration, /'secret-' \|\| emblem\.id::text/);
  assert.match(profile, /rpc\("public_profile_user_emblems"/);
});

test("UI mostra vetrina, massimo sei, modal e tre stati", () => {
  assert.match(ui, /Emblemi sbloccati:/);
  assert.match(ui, /unlocked\.slice\(0, 6\)/);
  assert.match(ui, /Mostra altri/);
  assert.match(ui, /Mostra tutti gli emblemi da sbloccare/);
  assert.match(ui, /rarityOrder\.map/);
  assert.match(ui, /unlocked/);
  assert.match(ui, /locked/);
  assert.match(ui, /secret/);
  assert.match(ui, /brightness-\[\.12\] grayscale contrast-125/);
  assert.match(ui, /Emblema segreto/);
  assert.match(ui, /unlockedAt/);
  assert.match(ui, /before:bg-sky-300/);
  assert.match(ui, /before:bg-slate-300/);
  assert.match(ui, /before:bg-red-400/);
  assert.match(ui, /before:bg-amber-300/);
  assert.match(ui, /secretSilhouettes/);
  for (const id of [6, 10, 17, 19]) {
    assert.match(ui, new RegExp(`${id}: "\\/emblemi-utenti\\/silhouettes\\/secret-${id}\\.png"`));
    assert.equal(existsSync(new URL(`../public/emblemi-utenti/silhouettes/secret-${id}.png`, import.meta.url)), true);
  }
  assert.match(ui, /aria-label="Emblema segreto"[\s\S]*aria-hidden="true"[\s\S]*>\?<\/span>/);
  assert.match(ui, /selected\.status === "secret" \? "Emblema segreto"/);
  assert.match(ui, /selected\.status !== "secret"/);
  assert.match(ui, /<svg aria-hidden="true"[\s\S]*M6 6l12 12M18 6L6 18/);
  assert.doesNotMatch(ui, />Ã—<|>×</);
  for (const slug of ["salto-di-qualita", "sull-onda-dell-entusiasmo", "veterano", "fedelta-eterna"]) assert.doesNotMatch(ui, new RegExp(`/silhouettes/${slug}`));
});

test("regole affidabili usano eventi esistenti senza modificare scoring", () => {
  for (const slug of ["prima-bet", "ci-hai-preso", "tipster-costante", "top-tipster", "schedina-perfetta", "scelgo-te", "prima-gioia", "sull-onda-dell-entusiasmo", "alzala-al-cielo", "ancora-insieme", "fedelta-eterna"]) assert.match(migration, new RegExp(`slug = '${slug}'`));
  assert.match(migration, /fantabet_round_submissions/);
  assert.match(migration, /fantabet_prediction_results/);
  assert.match(migration, /fantabet_round_evaluation/);
  assert.match(migration, /fantabet_support_match_events/);
  assert.match(migration, /fantabet_support_bonus_events/);
  assert.doesNotMatch(migration, /create or replace function (?:private\.fantabet_base_leaderboard|public\.fantabet_global_leaderboard|public\.salva_record_arcade)/);
});

test("Top Tipster richiede esplicitamente la valutazione completa", () => {
  const section = migration.slice(migration.indexOf("with round_slips as"), migration.indexOf("-- Tifo:"));
  assert.match(section, /fantabet_round_evaluation evaluation/);
  assert.match(section, /evaluation\.fully_evaluable/);
  assert.match(section, /ranked\.posizione <= 3/);
  const awards = ({ fullyEvaluable, finalPosition }) => fullyEvaluable && finalPosition <= 3;
  assert.equal(awards({ fullyEvaluable: false, provisionalPosition: 2, finalPosition: 2 }), false);
  assert.equal(awards({ fullyEvaluable: true, provisionalPosition: 2, finalPosition: 3 }), true);
  assert.equal(awards({ fullyEvaluable: true, provisionalPosition: 2, finalPosition: 5 }), false);
});

test("Top Tipster deriva scoring e spareggi giornalieri senza RPC assente", () => {
  assert.doesNotMatch(migration, /public\.fantabet_round_leaderboard/);
  const section = migration.slice(migration.indexOf("with round_slips as"), migration.indexOf("-- Tifo:"));
  assert.match(section, /fantabet_prediction_results/);
  assert.match(section, /fantabet_round_submissions/);
  assert.match(section, /having count\(\*\) = round\.required_predictions/);
  assert.match(section, /base_points \* slip\.perfect_multiplier/);
  assert.match(section, /order by scored\.round_points desc, scored\.perfect desc, scored\.correct_count desc,[\s\S]*profile\.username_normalizzato asc, scored\.profile_id asc/);
  assert.match(section, /ranked\.deadline_at[\s\S]*'fantabet_round_rank', ranked\.round_id::text/);
});

test("Sull'Onda si conquista esattamente al quinto utile e si resetta alla sconfitta", () => {
  const fifth = migration.slice(migration.indexOf("with ordered as ("), migration.indexOf("with history as ("));
  assert.match(fifth, /row_number\(\) over \(partition by profile_id, stagione_id, loss_group/);
  assert.match(fifth, /streak_position = 5/);
  assert.match(fifth, /recognized_at as achieved_at, partita_id as source_id/);
  const achievementIndex = (outcomes) => { let streak = 0; for (let index = 0; index < outcomes.length; index += 1) { streak = outcomes[index] === "L" ? 0 : streak + 1; if (streak === 5) return index; } return -1; };
  assert.equal(achievementIndex(["W", "D", "W", "D"]), -1);
  assert.equal(achievementIndex(["W", "D", "W", "D", "W"]), 4);
  assert.equal(achievementIndex(["W", "W", "L", "W", "D", "W", "D", "W"]), 7);
  assert.match(migration, /primary key \(profile_id, emblem_id\)/);
});

test("ufficializzazione conserva gli unlock ma impedisce backfill Tifo ineligible", () => {
  assert.doesNotMatch(migration, /delete from public\.user_emblem_unlocks/);
  const tifo = migration.slice(migration.indexOf("-- Tifo:"), migration.indexOf("return v_count"));
  assert.ok((tifo.match(/profile_support_ineligibilities/g) ?? []).length >= 5);
  assert.match(tifo, /not exists \(select 1 from public\.profile_support_ineligibilities/);
});

test("sync dopo partita è limitata ai profili con submission nella round coinvolta", () => {
  const trigger = migration.slice(migration.indexOf("trigger_sync_user_emblems_after_match"), migration.indexOf("create function public.public_profile_user_emblems"));
  assert.match(trigger, /fantabet_bets bet/);
  assert.match(trigger, /fantabet_round_submissions submission/);
  assert.match(trigger, /bet\.partita_id = new\.id/);
  assert.match(trigger, /sync_user_emblems\(v_profile_id\)/);
  assert.doesNotMatch(trigger, /sync_user_emblems\(null\)/);
});

test("Arcade e Fedeltà profilo non ricevono unlock inventati", () => {
  const sync = migration.slice(migration.indexOf("create function private.sync_user_emblems"), migration.indexOf("create function private.trigger_sync_user_emblems"));
  for (const slug of ["insert-coin", "salto-di-qualita", "top-player", "ingiocabile", "primo-anno", "secondo-anno", "veterano", "colonna-del-fanta-a-20", "re-dei-tipster"]) assert.doesNotMatch(sync, new RegExp(`slug = '${slug}'`));
  assert.doesNotMatch(sync, /profiles\.created_at|profile\.created_at/);
});
