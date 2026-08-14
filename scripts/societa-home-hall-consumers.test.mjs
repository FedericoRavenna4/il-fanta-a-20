import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home usa identità Supabase e dati competitivi legacy collegati per ID", async () => {
  const source = await read("src/app/page.tsx");

  assert.match(source, /await getActiveSocietaCatalog\(\)/);
  assert.match(source, /new Map\(societa\.map\(\(team\) => \[team\.id, team\]\)\)/);
  assert.match(source, /getRanking\(\)/);
  assert.match(source, /getPalmares\(\)/);
  assert.match(source, /societaMarquee/);
  assert.doesNotMatch(source, /getEmblemiSocieta|getRisultati/);
  assert.match(source, /logo: team\.logo_path/);
  assert.match(source, /slug: team\.slug/);
  assert.match(source, /badgeTipo: team\.badge_tipo/);
  assert.doesNotMatch(source, /getSocieta/);
  assert.doesNotMatch(source, /\.find\([^\n]*nome/);
});

test("Home conserva i record se manca l'identità attiva", async () => {
  const source = await read("src/app/page.tsx");

  assert.match(source, /historicalHomeTeam/);
  assert.match(source, /historicalHomeTeam\(item\.squadraId, item\.nomeRanking\)/);
  assert.match(source, /historicalHomeTeam\(piuTitolata\.squadraId, piuTitolata\.nomeSquadra\)/);
  assert.doesNotMatch(source, /podioRanking[\s\S]{0,400}filter\(.*team/);
});

test("Hall of Fame risolve il vincitore per societa.id senza cambiare i trofei", async () => {
  const [source, palmares, risultati] = await Promise.all([
    read("src/app/hall-of-fame/page.tsx"),
    read("src/lib/palmares.ts"),
    read("src/lib/risultati.ts"),
  ]);

  assert.match(source, /await getActiveSocietaCatalog\(\)/);
  assert.match(source, /societaById\.get\(record\.squadraId\)/);
  assert.match(source, /societaById\.get\(item\.squadraId\)/);
  assert.match(source, /record\.nomeSquadra/);
  assert.match(source, /item\.nomeStorico/);
  assert.doesNotMatch(source, /getSocieta/);
  assert.match(palmares, /nomeSquadra: row\.Nome_Squadra/);
  assert.match(risultati, /nomeStorico/);
});

test("Hall of Fame non elimina trofei di società inattive o storiche", async () => {
  const source = await read("src/app/hall-of-fame/page.tsx");

  assert.match(source, /resolveHallTeam/);
  assert.match(source, /slug: null, logo: "\/logo\.png"/);
  assert.match(source, /\.filter\(\(item\) => item\.count > 0\)/);
  assert.doesNotMatch(source, /\.filter\(\(item\) => item\.team\)/);
});

test("Home e Hall ereditano noStore dal loader condiviso senza cache di processo", async () => {
  const [home, hall, loader] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/app/hall-of-fame/page.tsx"),
    read("src/lib/societa/catalog.server.ts"),
  ]);

  assert.match(home, /getActiveSocietaCatalog/);
  assert.match(hall, /getActiveSocietaCatalog/);
  assert.match(loader, /noStore\(\)/);
  assert.doesNotMatch(`${home}\n${hall}`, /unstable_cache|cache\s*\(/);
});
