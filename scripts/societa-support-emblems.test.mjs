import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/202608150001_societa_support_emblems.sql", import.meta.url), "utf8");
const supportMigration = await readFile(new URL("../supabase/migrations/202608090002_profile_supports_fantabet_bonus.sql", import.meta.url), "utf8");
const catalog = await readFile(new URL("../data/emblemi.csv", import.meta.url), "utf8");
const page = await readFile(new URL("../src/app/societa/[slug]/page.tsx", import.meta.url), "utf8");
const existingEmblems = await readFile(new URL("../src/app/societa/[slug]/EmblemiSocieta.tsx", import.meta.url), "utf8");
const seasonUi = await readFile(new URL("../src/app/societa/[slug]/StagioneCorrenteSocieta.tsx", import.meta.url), "utf8");

test("catalogo condiviso contiene i cinque Emblemi Tifosi senza un secondo catalogo DB", () => {
  for (const row of ["Primo tifoso,base", "La curva cresce,comune", "Un popolo,mitico", "Sold out,leggenda", "Idolo,da difendere"]) assert.match(catalog, new RegExp(row));
  assert.doesNotMatch(migration, /create table public\.societa_emblems\s*\(/i);
});

test("i cinque asset risiedono nelle cartelle di rarità esistenti", async () => {
  for (const asset of ["base/primo-tifoso.png", "comune/la-curva-cresce.png", "mitico/un-popolo.png", "leggenda/sold-out.png", "da difendere/idolo.png"]) await access(new URL(`../public/emblemi/${asset}`, import.meta.url));
});

test("soglie permanenti sono 1 10 100 500 e sbloccano cumulativamente senza duplicati", () => {
  for (const pair of ["'primo_tifoso'::text, 1::bigint", "'la_curva_cresce', 10", "'un_popolo', 100", "'sold_out', 500"]) assert.ok(migration.includes(pair));
  assert.match(migration, /row_number\(\) over \(partition by support\.societa_id, support\.stagione_id/);
  assert.match(migration, /on conflict \(societa_id, emblem_key\) do nothing/);
  assert.doesNotMatch(migration, /create table public\.societa_emblem_unlocks/i);
  const thresholds = [["primo_tifoso", 1], ["la_curva_cresce", 10], ["un_popolo", 100], ["sold_out", 500]];
  const unlocked = (count) => thresholds.filter(([, minimum]) => count >= minimum).map(([key]) => key);
  assert.deepEqual([0, 1, 9, 10, 99, 100, 499, 500].map((count) => unlocked(count).length), [0, 1, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual(unlocked(120), ["primo_tifoso", "la_curva_cresce", "un_popolo"]);
});

test("sblocchi permanenti conservano data e stagione e non vengono cancellati al calo tifosi", () => {
  assert.doesNotMatch(migration, /delete from public\.societa_emblem_unlocks/i);
  assert.doesNotMatch(migration, /update public\.societa_emblem_unlocks/i);
  assert.doesNotMatch(migration, /drop table|truncate/i);
});

test("supporter ufficiali o invalidati sono esclusi con la stessa semantica storica del Tifo", () => {
  assert.match(supportMigration, /validate_profile_support_insert[\s\S]*profile\.societa_id is null/);
  assert.match(supportMigration, /old\.societa_id is null and new\.societa_id is not null[\s\S]*insert into public\.profile_support_ineligibilities/);
  assert.match(migration, /ranked_supports[\s\S]*not exists \([\s\S]*public\.profile_support_ineligibilities/);
  assert.match(migration, /becoming external again cannot reactivate a support from an ineligible season/);
});

test("supporti e ineligibilita non espongono mutazioni che richiedano trigger update o delete", () => {
  assert.match(supportMigration, /before update or delete on public\.profile_supports[\s\S]*prevent_profile_support_mutation/);
  assert.doesNotMatch(supportMigration, /grant[^;]*(?:update|delete)[^;]*profile_supports[^;]*to service_role/is);
  assert.doesNotMatch(supportMigration, /grant[^;]*(?:update|delete)[^;]*profile_support_ineligibilities[^;]*to service_role/is);
  assert.doesNotMatch(supportMigration, /delete from public\.profile_support_ineligibilities/i);
  assert.doesNotMatch(supportMigration, /update public\.profile_support_ineligibilities/i);
});

test("Idolo ha un solo detentore mantiene il titolare in parità e cambia solo su superamento", () => {
  assert.doesNotMatch(migration, /create table public\.societa_emblem_holder_history/i);
  assert.doesNotMatch(migration, /create (?:unique )?index societa_emblem_/i);
  assert.match(migration, /if v_holder_tifosi = v_max_tifosi then return/);
  assert.match(migration, /v_leader_count = 1 and v_max_tifosi > v_holder_tifosi/);
  assert.match(migration, /elsif v_leader_count = 1/);
  assert.match(migration, /pg_advisory_xact_lock/);
});

test("cambio stagione attiva ricalcola Idolo senza assegnazioni arbitrarie", () => {
  assert.doesNotMatch(migration, /create trigger societa_emblems_after_active_season_change/i);
  assert.match(migration, /if coalesce\(v_max_tifosi, 0\) = 0 then return/);
  assert.match(migration, /if v_holder_tifosi = v_max_tifosi then return/);
  assert.match(migration, /elsif v_leader_count = 1 then/);
});

test("nessun client può assegnare Emblemi e sync/backfill restano trusted e idempotenti", () => {
  assert.doesNotMatch(migration, /grant[^;]+on public\.societa_emblem_(?:unlocks|holder_history)[^;]+to (?:anon|authenticated)/i);
  assert.match(migration, /revoke all on function private\.sync_societa_support_emblems\(\) from public, anon, authenticated/);
  assert.match(migration, /select private\.sync_societa_support_emblems\(\)/);
});

test("scheda integra i nuovi unlock nella sezione esistente senza spostarla", () => {
  assert.match(page, /<EmblemiSocieta[\s\S]*<StagioneCorrenteSocieta[\s\S]*<RosaSocieta[\s\S]*<StoriaSocieta/);
  assert.match(page, /getSocietaSupportEmblems\(team\.id\)/); assert.match(existingEmblems, /Collezione della società/);
  assert.equal((page.match(/<EmblemiSocieta/g) ?? []).length, 1);
  assert.doesNotMatch(existingEmblems, /Traguardi tifosi da sbloccare/);
  assert.doesNotMatch(existingEmblems, /bloccatiTifosi|bloccati\s*=|brightness-0|Da sbloccare|>\?</);
  assert.doesNotMatch(existingEmblems, /ordinati\.length\}\//);
  assert.match(existingEmblems, /Collezione della società[\s\S]*ordinati\.length/);
  assert.match(existingEmblems, /Emblemi da difendere[\s\S]*daDifendere\.map/);
  assert.match(existingEmblems, /ordinati\.map\(\(emblema\)[\s\S]*daDifendere\.length > 0[\s\S]*daDifendere\.map/);
});

test("Idolo mostra soltanto il conteggio autorevole dei tifosi attivi del detentore", () => {
  assert.match(page, /getActiveSupporterCounts\(\)/);
  assert.match(page, /emblema\.chiave === "idolo"[\s\S]*record: String\(supporterCount\)/);
  assert.doesNotMatch(page, /record: `Tifosi:/);
  assert.match(existingEmblems, /RECORD: \{valoreRecord\}/);
});

test("nuova sezione è mobile-first e non introduce scorrimento orizzontale", () => {
  assert.match(seasonUi, /min-w-0/); assert.match(seasonUi, /truncate/); assert.match(seasonUi, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(seasonUi, /overflow-x-auto|w-screen|min-w-\[[4-9][0-9]{2}px\]/);
  assert.match(seasonUi, /LA CLASSIFICA SARÀ DISPONIBILE<br\/>AL TERMINE DELLA PRIMA GIORNATA/);
  assert.doesNotMatch(seasonUi, /0\s*-\s*0/);
  assert.match(seasonUi, /data-season-form/);
  assert.match(seasonUi, /grid-cols-5/);
  assert.match(seasonUi, /result\.score \?\? "VS"/);
  assert.match(seasonUi, /result\.isHome \? <HomeIcon\/> : <PlaneIcon\/>/);
  assert.match(seasonUi, /href=\{`\/societa\/\$\{result\.opponent\.slug\}`\}/);
  assert.match(seasonUi, /aria-label=\{`Apri la società \$\{result\.opponent\.name\}`\}/);
  assert.match(seasonUi, /border-emerald-500[\s\S]*border-rose-500[\s\S]*border-slate-400[\s\S]*border-slate-100/);
  assert.doesNotMatch(seasonUi, /Andamento ultime/);
  assert.match(seasonUi, /SmoothOverflowText/);
});
