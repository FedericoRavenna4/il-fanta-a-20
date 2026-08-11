import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { compareSocietaSources, mapDatabaseSocieta, parseSocietaCsv } from "./audit-societa-db-vs-csv.mjs";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const catalog = read("src", "lib", "societa", "catalog.server.ts");
const current = read("src", "lib", "societa", "current.server.ts");

test("nome personalizzato prevale e il nome ufficiale resta il fallback unico", () => {
  assert.equal(mapDatabaseSocieta({ id: 1, nome_ufficiale: "Ufficiale", nome_personalizzato: "Personalizzato" }).nome, "Personalizzato");
  assert.equal(mapDatabaseSocieta({ id: 1, nome_ufficiale: "Ufficiale", nome_personalizzato: null }).nome, "Ufficiale");
  assert.match(current, /return row\.nome_personalizzato \?\? row\.nome_ufficiale/);
  assert.equal((current.match(/nome_personalizzato \?\? row\.nome_ufficiale/g) ?? []).length, 1);
});

test("loader server-only supporta catalogo attivo e lookup ID", () => {
  assert.match(catalog, /^import "server-only"/);
  assert.match(catalog, /getActiveSocietaCatalog[\s\S]*\.eq\("attiva", true\)[\s\S]*\.order\("id"/);
  assert.match(catalog, /getActiveSocietaById[\s\S]*\.eq\("id", id\)[\s\S]*\.eq\("attiva", true\)/);
});

test("lookup slug distingue canonico, alias e sconosciuto", () => {
  assert.match(catalog, /getActiveSocietaBySlug/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: false/);
  assert.match(catalog, /from\("societa_slug_aliases"\)[\s\S]*\.eq\("slug", requestedSlug\)/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: true/);
  assert.match(catalog, /if \(!alias\.data\) return null/);
});

test("loader non usa CSV, getSocieta, service role o cache di processo", () => {
  assert.doesNotMatch(catalog, /societa\.csv|getSocieta|SUPABASE_SERVICE_ROLE_KEY|cachedSocieta|unstable_cache|cache\s*\(/);
  assert.match(catalog, /unstable_noStore as noStore/);
  assert.match(catalog, /createAuthenticatedSupabaseClient/);
});

test("CurrentSocieta espone l'anagrafica tipizzata richiesta", () => {
  for (const field of ["id", "nome", "nome_ufficiale", "nome_personalizzato", "slug", "fantallenatore", "nickname_instagram", "squadra_associata", "stagione_ingresso", "categoria", "girone", "logo_path", "storia", "storia_tifo", "badge_tipo", "attiva"]) {
    assert.match(current, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(current, /\bany\b/);
});

test("storia_tifo è distinta dalla storia completa e allineata in modo idempotente", () => {
  const types = read("src", "lib", "supabase", "database.types.ts");
  const reconciliation = read("supabase", "migrations", "202608100002_fantabet_visibility_societa_tifo.sql");
  assert.match(catalog, /storia,storia_tifo/);
  assert.match(current, /storia_tifo: row\.storia_tifo/);
  assert.match(types, /storia: string \| null; storia_tifo: string \| null/);
  assert.match(reconciliation, /add column if not exists storia_tifo text/);
  assert.match(reconciliation, /comment on column public\.societa\.storia_tifo/);
});

test("comparatore DB/CSV segnala soltanto divergenze e non scrive", () => {
  const csv = "ID,Nome,Allenatore,Instagram,Squadra,Ingresso,Categoria,Girone,B1,B2,B3,Logo\n1,Ufficiale,Mario,,Roma,2024/25,Serie A,,No,No,No,001.png";
  const csvRows = parseSocietaCsv(csv);
  const equalDb = [mapDatabaseSocieta({ id: 1, nome_ufficiale: "Ufficiale", nome_personalizzato: null, fantallenatore: "Mario", categoria: "Serie A", girone: null, logo_path: "/logos/001.png", stagione_ingresso: "2024/25" })];
  assert.deepEqual(compareSocietaSources(equalDb, csvRows), []);
  const changedDb = [{ ...equalDb[0], fantallenatore: "Luigi" }];
  assert.deepEqual(compareSocietaSources(changedDb, csvRows), [{ id: 1, field: "fantallenatore", database: "Luigi", csv: "Mario" }]);
  const audit = read("scripts", "audit-societa-db-vs-csv.mjs");
  assert.doesNotMatch(audit, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|service.role/i);
});

test("loader non modifica il tooling legacy o la logica competitiva", () => {
  assert.equal(fs.existsSync(path.join(root, "data", "societa.csv")), true);
  assert.match(read("src", "lib", "societa-legacy.ts"), /export function getSocieta/);
  assert.doesNotMatch(catalog, /fantabet|ranking|trofe|emblem|profile_support/);
});
