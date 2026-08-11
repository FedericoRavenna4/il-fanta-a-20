import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "202608100001_societa_identity_foundation.sql");
const registry = read("supabase", "migrations", "202608030001_societa_registry.sql");
const helper = read("src", "lib", "societa", "current.server.ts");

function parseCsvLine(line) {
  return line.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/).map((value) => value.replace(/^\"|\"$/g, "").trim());
}

function frontendSlug(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function migrationSlugs() {
  const block = migration.match(/from \(values([\s\S]*?)\) as seed\(id, slug\)/i)?.[1] ?? "";
  return new Map([...block.matchAll(/\((\d+),\s*'([^']+)'\)/g)].map((match) => [Number(match[1]), match[2]]));
}

function storedRenameNames(official, custom) {
  const officialStored = official.trim();
  const customTrimmed = custom?.trim() ?? null;
  const customStored = customTrimmed === "" ? null : customTrimmed;
  return {
    official: officialStored,
    custom: customStored,
    authoritative: customStored ?? officialStored,
  };
}

test("trigger calcola sempre nome_normalizzato dal nome corrente", () => {
  assert.match(migration, /before insert or update of nome_ufficiale, nome_personalizzato/i);
  assert.match(migration, /new\.nome_normalizzato := public\.normalize_societa_name\([\s\S]*coalesce\(new\.nome_personalizzato, new\.nome_ufficiale\)/i);
  assert.match(registry, /constraint societa_nome_normalizzato_coerente[\s\S]*check \(nome_normalizzato = public\.normalize_societa_name/i);
  assert.match(registry, /nome_normalizzato text not null unique/i);
});

test("nome personalizzato prevale e rimuovendolo torna ufficiale", () => {
  const currentName = (official, custom) => custom ?? official;
  assert.equal(currentName("Nome ufficiale", "Nome personalizzato"), "Nome personalizzato");
  assert.equal(currentName("Nome ufficiale", null), "Nome ufficiale");
  assert.match(helper, /row\.nome_personalizzato \?\? row\.nome_ufficiale/);
  assert.doesNotMatch(helper, /\bany\b/);
});

test("collisioni normalizzate restano rifiutate", () => {
  assert.match(registry, /nome_normalizzato text not null unique/i);
  assert.match(migration, /SOCIETA_NOME_AMBIGUO[\s\S]*errcode = '23505'/i);
  assert.doesNotMatch(migration, /drop constraint societa_nome_normalizzato_coerente|drop constraint[^;]*nome_normalizzato.*unique/i);
});

test("rinomina conserva societa id e slug canonico", () => {
  const rename = migration.slice(migration.indexOf("create or replace function public.admin_rename_societa"));
  assert.match(rename, /where id = p_societa_id[\s\S]*for update/i);
  const update = rename.match(/update public\.societa([\s\S]*?)where id = p_societa_id;/i)?.[1] ?? "";
  assert.match(update, /set nome_ufficiale[\s\S]*nome_personalizzato/i);
  assert.doesNotMatch(update, /\b(?:id|slug)\s*=/i);
  assert.match(rename, /insert into public\.societa_alias[\s\S]*rinomina_amministrativa/i);
  assert.match(rename, /public\.societa\.name_namespace/);
});

test("rinomina calcola il nome autorevole con la stessa semantica dell'UPDATE", () => {
  assert.deepEqual(storedRenameNames("Nome ufficiale", null), {
    official: "Nome ufficiale",
    custom: null,
    authoritative: "Nome ufficiale",
  });
  assert.equal(storedRenameNames("Nome ufficiale", "").authoritative, "Nome ufficiale");
  assert.equal(storedRenameNames("Nome ufficiale", "   ").authoritative, "Nome ufficiale");
  assert.equal(storedRenameNames("Nome ufficiale", " Nome personalizzato ").authoritative, "Nome personalizzato");

  const rename = migration.slice(migration.indexOf("create or replace function public.admin_rename_societa"));
  assert.match(rename, /new_name := coalesce\(\s*nullif\(pg_catalog\.btrim\(p_nome_personalizzato\), ''\),\s*pg_catalog\.btrim\(p_nome_ufficiale\)\s*\)/i);
  assert.match(rename, /new_normalized := public\.normalize_societa_name\(new_name\)/i);
  assert.match(rename, /other\.nome_normalizzato = new_normalized/i);
  assert.match(rename, /alias\.alias_normalizzato = new_normalized/i);
});

test("personalizzato vuoto controlla collisioni sul nome ufficiale effettivo", () => {
  assert.equal(storedRenameNames(" Societa esistente ", "").authoritative, "Societa esistente");
  const rename = migration.slice(migration.indexOf("create or replace function public.admin_rename_societa"));
  const normalizedAssignment = rename.indexOf("new_normalized := public.normalize_societa_name(new_name)");
  const canonicalCollision = rename.indexOf("other.nome_normalizzato = new_normalized");
  const aliasCollision = rename.indexOf("alias.alias_normalizzato = new_normalized");
  assert.ok(normalizedAssignment >= 0 && canonicalCollision > normalizedAssignment);
  assert.ok(aliasCollision > normalizedAssignment);
});

test("vecchio nome diventa alias usando il vincolo reale di societa_alias", () => {
  assert.match(registry, /constraint societa_alias_societa_normalizzato_unique\s+unique \(societa_id, alias_normalizzato\)/i);
  const rename = migration.slice(migration.indexOf("create or replace function public.admin_rename_societa"));
  assert.match(rename, /old_name := coalesce\(company\.nome_personalizzato, company\.nome_ufficiale\)/i);
  assert.match(rename, /old_normalized := public\.normalize_societa_name\(old_name\)/i);
  assert.match(rename, /insert into public\.societa_alias \(societa_id, alias, alias_normalizzato, fonte\)[\s\S]*values \(p_societa_id, old_name, old_normalized, 'rinomina_amministrativa'\)[\s\S]*on conflict \(societa_id, alias_normalizzato\) do nothing/i);
});

test("backfill contiene esattamente gli slug frontend delle 100 societa", () => {
  const lines = read("data", "societa.csv").trim().split(/\r?\n/).slice(1);
  const expected = new Map(lines.map((line) => { const row = parseCsvLine(line); return [Number(row[0]), frontendSlug(row[1])]; }));
  const actual = migrationSlugs();
  assert.equal(expected.size, 100);
  assert.equal(actual.size, expected.size);
  assert.deepEqual([...actual.entries()], [...expected.entries()]);
  assert.equal(new Set(actual.values()).size, actual.size);
  assert.match(migration, /SOCIETA_SLUG_BASELINE_INATTESA[\s\S]*attese 100 societa con ID 1-100/i);
});

test("slug canonico e alias hanno formato, unicita e FK robuste", () => {
  assert.match(migration, /alter column slug set not null/i);
  assert.match(migration, /constraint societa_slug_unique unique \(slug\)/i);
  assert.match(migration, /create table public\.societa_slug_aliases[\s\S]*slug text primary key[\s\S]*societa_id integer not null references public\.societa\(id\) on delete cascade/i);
  assert.match(migration, /validate_societa_canonical_slug[\s\S]*societa_slug_aliases[\s\S]*SOCIETA_SLUG_AMBIGUO/i);
  assert.match(migration, /validate_societa_slug_alias[\s\S]*company\.slug = new\.slug[\s\S]*SOCIETA_SLUG_AMBIGUO/i);
  assert.ok((migration.match(/pg_advisory_xact_lock/g) ?? []).length >= 2);
});

test("alias slug e rinomina non sono scrivibili dai client", () => {
  assert.match(migration, /alter table public\.societa_slug_aliases enable row level security/i);
  assert.match(migration, /revoke all on table public\.societa_slug_aliases from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.admin_rename_societa\(integer, text, text\)[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.admin_rename_societa\(integer, text, text\)[\s\S]*to service_role/i);
});

test("migration e mapper non toccano sistemi competitivi o consumer pubblici", () => {
  assert.doesNotMatch(migration, /alter table public\.(?:partite|profiles|profile_supports|fantabet_|classifica_arcade)/i);
  assert.doesNotMatch(migration, /update public\.(?:partite|profiles|profile_supports|fantabet_|classifica_arcade)/i);
  assert.match(helper, /import "server-only"/);
  assert.match(helper, /CurrentSocietaIdentity/);
});

test("migration e history restano incrementali e transazionali", () => {
  assert.match(migration, /^--[\s\S]*?\nbegin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.equal(fs.existsSync(path.join(root, "supabase", "migrations", "202608090002_profile_supports_fantabet_bonus.sql")), true);
  assert.equal(fs.existsSync(path.join(root, "supabase", "migrations", "202608090003_fantabet_support_match_points.sql")), true);
});
