import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/migrations/202608150002_rose_import.sql", "utf8");
const leagueSql = readFileSync("supabase/migrations/202608150004_rose_league_scope.sql", "utf8");
const previewServer = readFileSync("src/lib/admin-import/rose-preview.server.ts", "utf8");
const deletionSql = readFileSync("supabase/migrations/202608150003_admin_delete_rose_import.sql", "utf8");
const scopedSql = readFileSync("supabase/migrations/202608200001_fix_rose_import_scope.sql", "utf8");

test("Rose persistence is seasonal, normalized and snapshot based", () => {
  assert.match(sql, /create table public\.rose_giocatori/i);
  assert.match(sql, /unique \(stagione_id, giocatore_normalizzato\)/i);
  assert.match(sql, /admin_publish_rose_snapshot/i);
  assert.match(sql, /on conflict \(stagione_id, giocatore_normalizzato\) do update/i);
  assert.match(sql, /delete from public\.rose_giocatori current where current\.stagione_id = p_stagione_id/i);
});

test("Rose publication is restricted to service role and keeps history", () => {
  assert.match(sql, /revoke all on public\.rose_giocatori from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.admin_publish_rose_snapshot\(bigint, uuid, jsonb\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_publish_rose_snapshot\(bigint, uuid, jsonb\) to service_role/i);
  assert.doesNotMatch(sql, /delete from public\.rose_giocatori(?! current where current\.stagione_id)/i);
});

test("Rose migration is atomic and references deployed prerequisites", () => {
  assert.match(sql.trimStart(), /^begin;/i);
  assert.match(sql.trimEnd(), /commit;$/i);
  assert.match(sql, /execute function public\.set_importazioni_updated_at\(\)/i);
  assert.match(sql, /tipo = 'rose' and stato = 'validata'/i);
});

test("Rose publication serializes snapshots for the same season", () => {
  assert.match(sql, /pg_advisory_xact_lock\s*\(\s*pg_catalog\.hashtextextended\s*\(\s*'rose-snapshot-'\s*\|\|\s*p_stagione_id::text\s*,\s*0\s*\)\s*\)/i);
  assert.ok(sql.indexOf("pg_advisory_xact_lock") < sql.indexOf("create temporary table rose_snapshot_rows"));
});

test("Rose snapshot rejects null business fields before final constraints", () => {
  for (const condition of [
    "giocatore is null",
    "giocatore_normalizzato is null",
    "ruolo is null",
    "ruolo not in ('P','D','C','A')",
    "prezzo is null",
    "prezzo < 0",
  ]) assert.ok(sql.includes(condition), `Missing validation: ${condition}`);
  assert.match(sql, /raise exception 'La fotografia Rose contiene righe non valide'/i);
});

test("RPC execute grant is intact and service-role only", () => {
  const exactGrant = "grant execute on function public.admin_publish_rose_snapshot(bigint, uuid, jsonb) to service_role;";
  assert.ok(sql.includes(exactGrant));
  assert.doesNotMatch(sql, /grant execute on function public\.admin_publish_rose_snapshot\([^;]+\) to (?:anon|authenticated|public)/i);
});

test("identical snapshots do not issue a material UPDATE", () => {
  const upsert = sql.match(/on conflict \(stagione_id, giocatore_normalizzato\) do update[\s\S]*?;\s*\n\s*delete from public\.rose_giocatori/i)?.[0] ?? "";
  for (const column of ["societa_id", "giocatore", "squadra_reale", "ruolo", "prezzo"]) {
    assert.match(upsert, new RegExp(`existing\\.${column} is distinct from excluded\\.${column}`, "i"));
  }
  const whereClause = upsert.split(/\bwhere\b/i)[1] ?? "";
  assert.doesNotMatch(whereClause, /import_batch_id\s+is distinct from/i);
});

test("unchanged rows retain audit timestamps and batch while real changes update both", () => {
  const current = { societa_id: 1, giocatore: "Lautaro", squadra_reale: "Inter", ruolo: "A", prezzo: 50, import_batch_id: "batch-1", updated_at: "2026-08-15T10:00:00Z" };
  const persistedFields = ["societa_id", "giocatore", "squadra_reale", "ruolo", "prezzo"];
  const publish = (incoming, batch, now) => persistedFields.some((field) => current[field] !== incoming[field])
    ? { ...current, ...incoming, import_batch_id: batch, updated_at: now }
    : { ...current };
  assert.deepEqual(publish({ ...current }, "batch-2", "2026-08-15T11:00:00Z"), current);
  const changed = publish({ ...current, prezzo: 51 }, "batch-2", "2026-08-15T11:00:00Z");
  assert.equal(changed.prezzo, 51);
  assert.equal(changed.import_batch_id, "batch-2");
  assert.equal(changed.updated_at, "2026-08-15T11:00:00Z");
});

test("counters and deletion stay scoped to the selected season", () => {
  assert.match(sql, /select count\(\*\) into v_updated[\s\S]*?is distinct from incoming\.prezzo/i);
  assert.match(sql, /return query select v_inserted, v_updated, v_removed, v_unchanged/i);
  assert.match(sql, /delete from public\.rose_giocatori current where current\.stagione_id = p_stagione_id/i);
  assert.doesNotMatch(sql, /delete from public\.rose_giocatori current where(?! current\.stagione_id = p_stagione_id)/i);
});

test("incremental league scope preserves deployed 002 and supports five parallel leagues", () => {
  assert.match(leagueSql.trimStart(), /^begin;/i);
  assert.match(leagueSql.trimEnd(), /commit;$/i);
  assert.match(leagueSql, /add column lega_codice text not null default 'default'/i);
  assert.match(leagueSql, /alter column lega_codice drop default/i);
  assert.match(leagueSql, /unique \(stagione_id, lega_codice, giocatore_normalizzato\)/i);
  assert.match(leagueSql, /on conflict \(stagione_id, lega_codice, giocatore_normalizzato\) do update/i);
  assert.match(leagueSql, /group by lega_codice, giocatore_normalizzato/i);
});

test("normal import derives league server-side without requiring a file column", () => {
  assert.match(previewServer, /select\("id,nome_ufficiale,nome_personalizzato,categoria,girone"\)/);
  assert.match(previewServer, /getRisultati\(\)/);
  assert.match(previewServer, /result\.competizione !== "Campionato"/);
  assert.match(previewServer, /currentLeagueCode\(team\.categoria, team\.girone\)/);
  assert.match(previewServer, /legaCodice: id \? leagueByTeam\.get\(id\)/);
});

test("first real-scope reimport removes all transitional default rows", () => {
  const existing = Array.from({ length: 456 }, (_, index) => ({ season: 4, league: "default", player: `p${index}` }));
  const incoming = Array.from({ length: 456 }, (_, index) => ({ season: 4, league: index < 228 ? "serie-a" : "serie-b", player: `p${index}` }));
  const incomingKeys = new Set(incoming.map((row) => `${row.league}:${row.player}`));
  const removed = existing.filter((row) => !incomingKeys.has(`${row.league}:${row.player}`));
  const finalRows = [...incoming];
  assert.equal(removed.length, 456);
  assert.equal(finalRows.length, 456);
  assert.equal(finalRows.filter((row) => row.league === "default").length, 0);
  assert.equal(new Set(finalRows.map((row) => `${row.league}:${row.player}`)).size, 456);
  assert.match(leagueSql, /lega_codice not in \('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c'\)/i);
});

test("league-aware snapshot keeps transfers stable and deletion seasonal", () => {
  for (const fragment of [
    "current.lega_codice = incoming.lega_codice",
    "current.giocatore_normalizzato = incoming.giocatore_normalizzato",
    "current.societa_id is distinct from incoming.societa_id",
  ]) assert.ok(leagueSql.includes(fragment));
  assert.match(leagueSql, /delete from public\.rose_giocatori current\s+where current\.stagione_id = p_stagione_id/i);
  assert.doesNotMatch(leagueSql, /delete from public\.rose_giocatori current\s+where current\.stagione_id <> p_stagione_id/i);
});

test("league-aware RPC remains service-role only", () => {
  assert.match(leagueSql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(leagueSql, /revoke all on function public\.admin_publish_rose_snapshot\(bigint, uuid, jsonb\) from public, anon, authenticated/i);
  assert.match(leagueSql, /grant execute on function public\.admin_publish_rose_snapshot\(bigint, uuid, jsonb\) to service_role/i);
});

test("003 deletes every league of the target season and no other season", () => {
  assert.match(deletionSql, /delete from public\.rose_giocatori\s+where stagione_id = target\.stagione_id/i);
  assert.doesNotMatch(deletionSql, /delete from public\.rose_giocatori[\s\S]*lega_codice/i);
});

test("new Rose RPC requires one explicit league and removes the unsafe three-argument signature", () => {
  assert.match(scopedSql, /drop function if exists public\.admin_publish_rose_snapshot\(bigint, uuid, jsonb\)/i);
  assert.match(scopedSql, /p_stagione_id bigint, p_lega_codice text, p_import_id uuid, p_rows jsonb/i);
  assert.match(scopedSql, /riepilogo ->> 'legaCodice' = v_lega_codice/i);
  assert.match(scopedSql, /where lega_codice is distinct from v_lega_codice/i);
});

test("new Rose RPC counts, upserts and deletes only the declared league", () => {
  assert.match(scopedSql, /current\.stagione_id = p_stagione_id and current\.lega_codice = v_lega_codice/g);
  assert.match(scopedSql, /delete from public\.rose_giocatori current[\s\S]*?current\.stagione_id = p_stagione_id and current\.lega_codice = v_lega_codice/i);
  assert.doesNotMatch(scopedSql, /current\.lega_codice in\s*\(\s*select distinct/i);
  assert.match(scopedSql, /grant execute on function public\.admin_publish_rose_snapshot\(bigint, text, uuid, jsonb\)[\s\S]*to service_role/i);
});

test("preview and publish share the explicit league scope and compare all counters", () => {
  assert.match(previewServer, /\.eq\("stagione_id", seasonId\)[\s\S]*?\.eq\("lega_codice", targetLeagueCode\)/);
  assert.match(previewServer, /p_lega_codice: targetLeagueCode/);
  for (const counter of ["insert", "update", "rimossi", "unchanged"]) assert.ok(previewServer.includes(`previewSummary?.${counter}`));
  for (const counter of ["insert", "update", "rimossi", "unchanged"]) assert.match(scopedSql, new RegExp(`riepilogo ->> '${counter}'`));
  assert.ok(scopedSql.indexOf("riepilogo ->> 'insert'") < scopedSql.indexOf("insert into public.rose_giocatori"));
});

test("inspect Rose validates league and counts only the current import of that league", () => {
  assert.match(scopedSql, /create function public\.admin_inspect_rose_import\(p_import_id uuid\)/i);
  assert.match(scopedSql, /player\.stagione_id = target\.stagione_id[\s\S]*player\.lega_codice = target\.target_lega/i);
  assert.match(scopedSql, /latest\.stagione_id = target\.stagione_id[\s\S]*latest\.riepilogo ->> 'legaCodice'\)\) = target\.target_lega/i);
  assert.match(scopedSql, /target\.target_lega in \('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c'\)/i);
});

test("delete Rose scopes latest check, lock, count and delete to one league", () => {
  assert.match(scopedSql, /target_lega := pg_catalog\.lower\(pg_catalog\.btrim\(target\.riepilogo ->> 'legaCodice'\)\)/i);
  assert.match(scopedSql, /latest\.stagione_id = target\.stagione_id[\s\S]*latest\.riepilogo ->> 'legaCodice'\)\) = target_lega/i);
  assert.match(scopedSql, /'rose-snapshot-' \|\| target\.stagione_id::text \|\| '-' \|\| target_lega/i);
  assert.match(scopedSql, /delete from public\.rose_giocatori\s+where stagione_id = target\.stagione_id\s+and lega_codice = target_lega/i);
  assert.match(scopedSql, /latest\.stato in \('pubblicata', 'pubblicata_con_warning', 'eliminata'\)/i);
});
