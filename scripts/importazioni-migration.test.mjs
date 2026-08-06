import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(root, "supabase", "migrations", "202608050003_importazioni.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const privilegesPath = path.join(root, "supabase", "migrations", "202608050004_service_role_import_privileges.sql");
const privilegesSql = fs.readFileSync(privilegesPath, "utf8");
const catalogPrivilegesPath = path.join(root, "supabase", "migrations", "202608060001_service_role_catalog_privileges.sql");
const catalogPrivilegesSql = fs.readFileSync(catalogPrivilegesPath, "utf8");

function includes(pattern, message) {
  assert.match(sql, pattern, message);
}

test("la migrazione è transazionale e crea public.importazioni", () => {
  includes(/^\s*--[^\n]*\n\s*begin;/i, "La migrazione deve iniziare in transazione");
  includes(/create table public\.importazioni\s*\(/i, "Manca public.importazioni");
  includes(/\ncommit;\s*$/i, "La migrazione deve chiudere la transazione");
});

test("tipi, stati, sorgenti e vincoli richiesti sono presenti", () => {
  ["calendario_campionato", "calendario_coppa", "rose", "mercato", "altro"].forEach((value) => includes(new RegExp(`'${value}'`), `Tipo mancante: ${value}`));
  ["anteprima", "validata", "pubblicata", "pubblicata_con_warning", "errore", "annullata"].forEach((value) => includes(new RegExp(`'${value}'`), `Stato mancante: ${value}`));
  ["leghe_fantacalcio", "manuale", "altro"].forEach((value) => includes(new RegExp(`'${value}'`), `Sorgente mancante: ${value}`));
  includes(/dimensione_file is null or dimensione_file >= 0/i);
  includes(/completata_il is null or completata_il >= iniziata_il/i);
  includes(/tipo not in \('calendario_campionato', 'calendario_coppa'\)[\s\S]*edizione_competizione_id is not null/i);
  includes(/stato <> 'errore' or error_count > 0/i);
  includes(/stato <> 'pubblicata_con_warning' or warning_count > 0/i);
});

test("hash, ricerca e collegamenti import_batch sono indicizzati", () => {
  includes(/create index importazioni_file_hash_idx[\s\S]*\(file_hash\)/i);
  includes(/create index importazioni_ricerca_idx[\s\S]*stagione_id[\s\S]*edizione_competizione_id[\s\S]*tipo[\s\S]*stato[\s\S]*created_at desc/i);
  includes(/foreign key \(import_batch_id\)[\s\S]*references public\.importazioni\(id\)[\s\S]*on delete set null/i);
  includes(/create index partite_import_batch_id_idx/i);
  includes(/create index riposi_competizione_import_batch_id_idx/i);
});

test("RLS è abilitata senza policy o grant client", () => {
  includes(/alter table public\.importazioni enable row level security/i);
  includes(/revoke all on public\.importazioni from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*on public\.importazioni/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all)[\s\S]*on public\.importazioni/i);
});

test("updated_at usa un trigger security invoker", () => {
  includes(/function public\.set_importazioni_updated_at\(\)[\s\S]*security invoker/i);
  includes(/create trigger importazioni_set_updated_at[\s\S]*before update on public\.importazioni/i);
  assert.doesNotMatch(sql, /security definer/i);
});

test("le migrazioni prerequisite restano separate e ordinate", () => {
  assert.equal(fs.existsSync(path.join(root, "supabase", "migrations", "202608050001_partite.sql")), true);
  assert.equal(fs.existsSync(path.join(root, "supabase", "migrations", "202608050002_riposi_competizione.sql")), true);
  const partite = fs.readFileSync(path.join(root, "supabase", "migrations", "202608050001_partite.sql"), "utf8");
  assert.match(partite, /import_batch_id uuid null/i);
});

test("la migrazione incrementale concede al backend i privilegi minimi richiesti", () => {
  assert.match(privilegesSql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(privilegesSql, /grant usage on schema public to service_role/i);
  assert.match(privilegesSql, /grant select, insert, update, delete\s+on table public\.importazioni\s+to service_role/i);
  assert.match(privilegesSql, /grant select, insert, update\s+on table public\.partite\s+to service_role/i);
  assert.match(privilegesSql, /grant select, insert, update\s+on table public\.riposi_competizione\s+to service_role/i);
  assert.match(privilegesSql, /grant usage, select\s+on sequence public\.partite_id_seq\s+to service_role/i);
  assert.match(privilegesSql, /grant usage, select\s+on sequence public\.riposi_competizione_id_seq\s+to service_role/i);
  assert.match(privilegesSql, /server-only/i);
  assert.match(privilegesSql, /commit;\s*$/i);
});

test("la migrazione privilegi non amplia i permessi client e non modifica RLS", () => {
  assert.doesNotMatch(privilegesSql, /\bto\s+(anon|authenticated|public)\b/i);
  assert.doesNotMatch(privilegesSql, /disable row level security|create policy|alter policy/i);
  assert.doesNotMatch(privilegesSql, /grant\s+all/i);
});

test("la migrazione catalogo concede al backend soltanto le letture necessarie", () => {
  assert.match(catalogPrivilegesSql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(catalogPrivilegesSql, /grant usage on schema public to service_role/i);
  for (const table of ["stagioni", "competizioni", "edizioni_competizioni", "societa", "societa_alias"]) {
    assert.match(catalogPrivilegesSql, new RegExp(`public\\.${table}`), `Manca il catalogo public.${table}`);
  }
  assert.match(catalogPrivilegesSql, /grant select[\s\S]*to service_role/i);
  assert.match(catalogPrivilegesSql, /commit;\s*$/i);
});

test("la migrazione catalogo è idempotente e non amplia privilegi client o RLS", () => {
  assert.doesNotMatch(catalogPrivilegesSql, /\bto\s+(anon|authenticated|public)\b/i);
  assert.doesNotMatch(catalogPrivilegesSql, /\b(insert|update|delete|truncate|references|trigger)\b/i);
  assert.doesNotMatch(catalogPrivilegesSql, /disable row level security|create policy|alter policy/i);
  assert.doesNotMatch(catalogPrivilegesSql, /grant\s+all/i);
  assert.doesNotMatch(catalogPrivilegesSql, /revoke/i);
});
