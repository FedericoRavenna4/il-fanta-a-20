import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Ranking conserva i dati competitivi legacy e risolve l'identità Supabase per ID", async () => {
  const source = await read("src/lib/rankingRows.ts");

  assert.match(source, /getRanking\(\)/);
  assert.match(source, /getPalmares\(\)/);
  assert.match(source, /getActiveSocietaCatalog\(\)/);
  assert.match(source, /new Map\(societa\.map\(\(team\) => \[team\.id, team\]\)\)/);
  assert.match(source, /societaById\.get\(item\.squadraId\)/);
  assert.match(source, /posizione: item\.posizione/);
  assert.match(source, /puntiRanking: item\.puntiRanking/);
  assert.match(source, /palmaresItem\.squadraId === item\.squadraId/);
  assert.doesNotMatch(source, /getSocieta/);
});

test("Statistiche attende il catalogo e non mostra nomi CSV come fallback", async () => {
  const [page, smart, client] = await Promise.all([
    read("src/app/statistiche/page.tsx"),
    read("src/app/ranking/RankingSmart.tsx"),
    read("src/app/ranking/RankingClient.tsx"),
  ]);

  assert.match(page, /async function StatistichePage/);
  assert.match(page, /await getRankingRows\(\)/);
  assert.doesNotMatch(smart, /\?\? row\.nomeRanking/);
  assert.doesNotMatch(client, /\?\? row\.nomeRanking/);
});

test("Campionati usa anagrafica e badge Supabase senza fallback CSV", async () => {
  const source = await read("src/app/campionati/page.tsx");

  assert.match(source, /await getActiveSocietaCatalog\(\)/);
  assert.match(source, /team\.categoria === lega\.nome/);
  assert.match(source, /team\.badge_tipo === "campione_in_carica"/);
  assert.match(source, /team\.badge_tipo === "neo_promossa"/);
  assert.match(source, /href={`\/societa\/\$\{team\.slug\}`}/);
  assert.doesNotMatch(source, /getSocieta/);
  assert.doesNotMatch(source, /legaAttuale/);
});

test("Preview live usa il loader condiviso e collega partite e società per ID", async () => {
  const source = await read("src/app/campionati-live-preview/data.ts");

  assert.match(source, /await getActiveSocietaCatalog\(\)/);
  assert.match(source, /new Map\(rawTeams\.filter\(\(t\) => teamIds\.includes\(t\.id\)\)/);
  assert.match(source, /teamById\.get\(m\.societa_casa_id\)/);
  assert.match(source, /teamById\.get\(m\.societa_trasferta_id\)/);
  assert.match(source, /slug: row\.slug/);
  assert.doesNotMatch(source, /fallbackSlug|getSocieta/);
});

test("Preview simulata usa categoria e girone Supabase senza posizione nell'array", async () => {
  const [page, data] = await Promise.all([
    read("src/app/campionati-preview/page.tsx"),
    read("src/app/campionati-preview/mock-data.ts"),
  ]);

  assert.match(page, /await getActiveSocietaCatalog\(\)/);
  assert.match(data, /const embeddedGroup = team\.categoria\?\.match/);
  assert.match(data, /const actualCategory = embeddedGroup \? "Serie C" : team\.categoria/);
  assert.match(data, /normalizeGroup\(embeddedGroup \?\? team\.girone\)/);
  assert.match(data, /actualCategory === category && actualGroup === expectedGroup/);
  assert.match(data, /slug: team\.slug/);
  assert.doesNotMatch(data, /const fallback|leagueIndex \* 20|getSocieta/);
});
