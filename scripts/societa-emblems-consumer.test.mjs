import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("pagina Emblemi usa l'identità corrente Supabase tramite ID", async () => {
  const source = await read("src/app/emblemi/page.tsx");

  assert.match(source, /getActiveSocietaCatalog\(\)/);
  assert.match(source, /new Map\(societa\.map\(\(team\) => \[team\.id, team\]\)\)/);
  assert.match(source, /societaById\.get\(assegnazione\.squadraId\)/);
  assert.match(source, /nome: team\?\.nome \?\? assegnazione\.nomeSocieta/);
  assert.match(source, /slug: team\?\.slug \?\? null/);
  assert.doesNotMatch(source, /getSocieta|societa\.csv/);
  assert.doesNotMatch(source, /find\([^\n]*nome|slugify/);
});

test("New Entry corrente deriva esclusivamente da badge_tipo Supabase", async () => {
  const [page, library] = await Promise.all([
    read("src/app/emblemi/page.tsx"),
    read("src/lib/emblemi.ts"),
  ]);

  assert.match(page, /team\.badge_tipo === "new_entry"/);
  assert.match(page, /getEmblemiSocieta\(newEntryIds\)/);
  assert.match(library, /getEmblemiSocieta\(currentNewEntryIds: ReadonlySet<number>\)/);
  assert.doesNotMatch(library, /getSocieta|badgeNewEntry|societa\.csv/);
});

test("rinomina non altera associazioni, conteggi o Da difendere", async () => {
  const library = await read("src/lib/emblemi.ts");

  assert.match(library, /squadraId: Number\(values\[1\]\)/);
  assert.match(library, /cella !== "X" && cella !== "D"/);
  assert.match(library, /stato: cella === "D" \? "Da difendere" : "Sbloccato"/);
  assert.match(library, /currentNewEntryIds\.has\(Number\(values\[1\]\)\) \? \[\] : emblemi/);
  assert.doesNotMatch(library, /nomeSocieta.*(?:find|includes|===)/);
});

test("catalogo, rarità e fallback competitivo delle intestazioni restano legacy", async () => {
  const library = await read("src/lib/emblemi.ts");

  for (const rarity of ["Base", "Comune", "Raro", "Epico", "Mitico", "Leggendario"]) {
    assert.match(library, new RegExp(`"${rarity}"`));
  }
  assert.match(library, /trovaEmblemaDaIntestazione/);
  assert.match(library, /return catalogo\[indice\] \?\? null/);
  assert.match(library, /data", "emblemi\.csv"/);
  assert.match(library, /data", "societa_emblemi\.csv"/);
});

test("società mancante conserva assegnazione e nome storico senza slug fittizio", async () => {
  const source = await read("src/app/emblemi/page.tsx");

  assert.match(source, /nome: team\?\.nome \?\? assegnazione\.nomeSocieta/);
  assert.match(source, /slug: team\?\.slug \?\? null/);
  assert.doesNotMatch(source, /\.filter\([^)]*societaById/);
});

test("i consumer assegnazioni passano lo stato New Entry corrente e la Home usa il catalogo", async () => {
  const [home, detail, profile] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/app/societa/[slug]/page.tsx"),
    read("src/app/user/[username]/page.tsx"),
  ]);

  assert.match(home, /getCatalogoEmblemi\(\)/);
  assert.match(home, /<HomeEmblemShowcase emblems=\{emblemiVetrina\}/);
  assert.doesNotMatch(home, /getEmblemiSocieta\(/);
  assert.match(detail, /getEmblemiSocieta\(new Set\(team\.badge_tipo === "new_entry"/);
  assert.match(profile, /getEmblemiSocieta\(newEntryIds\)/);
});
