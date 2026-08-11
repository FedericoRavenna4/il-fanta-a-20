import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");

test("the sitemap reads the shared active Supabase catalog", () => {
  assert.match(source, /getActiveSocietaCatalog\(\)/);
  assert.doesNotMatch(source, /getSocieta\(|societa\.csv|cachedSocieta/);
});

test("company URLs use only the canonical Supabase slug", () => {
  assert.match(source, /\/societa\/\$\{team\.slug\}/);
  assert.doesNotMatch(source, /slugify|deriveSlug|nome_normalizzato|team\.nome/i);
});

test("aliases are not queried or emitted as separate sitemap entries", () => {
  assert.doesNotMatch(source, /societa_slug_aliases|getActiveSocietaBySlug|alias/i);
});

test("one sitemap URL is produced for each active catalog row", () => {
  assert.match(source, /\(await getActiveSocietaCatalog\(\)\)\.map\(\(team\) =>/);
  assert.doesNotMatch(source, /flatMap|concat\([^)]*societa|new Set|filter\(/);
});

test("the metadata route remains dynamic without process caching", () => {
  assert.match(source, /export default async function sitemap/);
  assert.doesNotMatch(source, /unstable_cache|\bcache\s*\(|revalidate\s*=|force-static/);
});
