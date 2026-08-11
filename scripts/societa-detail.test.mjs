import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const page = read("src", "app", "societa", "[slug]", "page.tsx");
const catalog = read("src", "lib", "societa", "catalog.server.ts");
const current = read("src", "lib", "societa", "current.server.ts");

test("slug canonico usa la società Supabase e alias effettua redirect permanente", () => {
  assert.match(page, /const lookup = await getActiveSocietaBySlug\(slug\)/);
  assert.match(page, /if \(lookup\.isAlias\) permanentRedirect\(`\/societa\/\$\{lookup\.canonicalSlug\}`\)/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: false/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: true/);
});

test("slug sconosciuto o società inattiva produce 404 senza fallback CSV", () => {
  assert.match(page, /if \(!lookup\) notFound\(\)/);
  assert.match(catalog, /\.eq\("attiva", true\)/);
  assert.match(catalog, /if \(!alias\.data\) return null/);
  assert.doesNotMatch(page, /getSocieta|societa\.csv|cachedSocieta/);
});

test("nome corrente resta centralizzato e non viene ricostruito dalla pagina", () => {
  assert.match(current, /return row\.nome_personalizzato \?\? row\.nome_ufficiale/);
  assert.match(page, /title: team\.nome/);
  assert.match(page, /\{team\.nome\}/);
  assert.doesNotMatch(page, /nome_personalizzato\s*\?\?|coalesce|normalize.*nome/i);
});

test("fantallenatore storia logo categoria e girone arrivano dal record Supabase", () => {
  assert.match(page, /team\.fantallenatore/);
  assert.match(page, /team\.storia/);
  assert.match(page, /src=\{team\.logo_path \?\? "\/logos\/logo\.png"\}/);
  assert.match(page, /team\.categoria/);
  assert.match(page, /team\.girone/);
  assert.match(page, /team\.stagione_ingresso/);
  assert.match(page, /team\.badge_tipo/);
  assert.doesNotMatch(page, /getStorieSocieta|storiaEditoriale|\.logo\b|\.legaAttuale|\.stagioneIngresso|\.badgeNewEntry/);
});

test("ranking trofei risultati rose ed emblemi legacy si uniscono soltanto per ID", () => {
  assert.match(page, /ranking\.find\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /palmares\.find\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /rose\.filter\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /risultati\.filter\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /emblemi\.find\([\s\S]*item\.squadraId === team\.id/);
  assert.doesNotMatch(page, /nomeSquadra\s*===|nomeRanking\s*===|\.find\([^)]*team\.nome/);
});

test("pagina dinamica eredita no-store e non genera slug dal CSV", () => {
  assert.match(catalog, /unstable_noStore as noStore/);
  assert.match(catalog, /noStore\(\)/);
  assert.doesNotMatch(page, /generateStaticParams|unstable_cache|cachedSocieta|data\/societa\.csv/);
});

test("metadata usa identità e URL canonici Supabase", () => {
  assert.match(page, /generateMetadata[\s\S]*getActiveSocietaBySlug\(slug\)/);
  assert.match(page, /path: `\/societa\/\$\{team\.slug\}`/);
});
