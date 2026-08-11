import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const page = read("src", "app", "societa", "page.tsx");
const client = read("src", "app", "societa", "SocietaClient.tsx");
const catalog = read("src", "lib", "societa", "catalog.server.ts");
const current = read("src", "lib", "societa", "current.server.ts");

test("catalogo /societa usa Supabase e non getSocieta per l'anagrafica", () => {
  assert.match(page, /await getActiveSocietaCatalog\(\)/);
  assert.doesNotMatch(page, /getSocieta|data\/societa\.csv|cachedSocieta/);
  assert.doesNotMatch(client, /getSocieta|data\/societa\.csv|cachedSocieta/);
});

test("nome personalizzato e fallback ufficiale restano centralizzati", () => {
  assert.match(current, /return row\.nome_personalizzato \?\? row\.nome_ufficiale/);
  assert.match(client, /team\.nome/);
  assert.doesNotMatch(page + client, /nome_personalizzato\s*\?\?|normalize.*nome|slugify/i);
});

test("ricerca usa nome fantallenatore squadra e nickname Supabase", () => {
  assert.match(client, /team\.nome/);
  assert.match(client, /team\.squadra_associata/);
  assert.match(client, /team\.fantallenatore/);
  assert.match(client, /team\.nickname_instagram/);
  assert.match(client, /Cerca società, squadra, fantallenatore o nickname/);
});

test("filtri usano categoria e girone Supabase", () => {
  assert.match(client, /getLeagueLabel\(team\) === filter/);
  assert.match(client, /team\.categoria/);
  assert.match(client, /team\.girone/);
  assert.doesNotMatch(client, /legaAttuale/);
});

test("logo e link usano logo_path e slug canonico Supabase", () => {
  assert.match(page, /team\.logo_path \?\? "\/logos\/logo\.png"/);
  assert.match(client, /team\.logo_path \?\? "\/logos\/logo\.png"/);
  assert.match(client, /href=\{`\/societa\/\$\{team\.slug\}`\}/);
  assert.doesNotMatch(page + client, /team\.logo\b|slug\s*=|replace\(\/\[\^a-z0-9\]/);
});

test("ranking e trofei legacy sono uniti esclusivamente tramite societa.id", () => {
  assert.match(page, /new Map\(getRanking\(\)\.map\(\(item\) => \[item\.squadraId, item\]\)\)/);
  assert.match(page, /new Map\(getPalmares\(\)\.map\(\(item\) => \[item\.squadraId, item\]\)\)/);
  assert.match(page, /rankingById\.get\(team\.id\)/);
  assert.match(page, /trophiesById\.get\(team\.id\)/);
  assert.doesNotMatch(page, /nomeRanking|nomeSquadra|team\.nome\s*===/);
});

test("badge corrente deriva soltanto da badge_tipo Supabase", () => {
  assert.match(client, /getBadge\(team\.badge_tipo\)/);
  assert.match(client, /new_entry/);
  assert.match(client, /neo_promossa/);
  assert.match(client, /campione_in_carica/);
  assert.doesNotMatch(client, /badgeNewEntry|badgeNeopromossa|badgeCampioneSerieA/);
});

test("società inattive sono escluse e non esiste cache di processo", () => {
  assert.match(catalog, /getActiveSocietaCatalog[\s\S]*\.eq\("attiva", true\)/);
  assert.match(catalog, /unstable_noStore as noStore/);
  assert.match(catalog, /noStore\(\)/);
  assert.doesNotMatch(page + client, /unstable_cache|cachedSocieta|generateStaticParams/);
});
