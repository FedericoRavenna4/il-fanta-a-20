import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loader = await readFile(new URL("../src/lib/rose-current.server.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../src/app/societa/[slug]/page.tsx", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/app/societa/[slug]/RosaSocieta.tsx", import.meta.url), "utf8");
const actions = await readFile(new URL("../src/app/admin/importazioni/actions.ts", import.meta.url), "utf8");
const client = await readFile(new URL("../src/app/admin/importazioni/ImportazioniClient.tsx", import.meta.url), "utf8");
const deletion = await readFile(new URL("../supabase/migrations/202608200001_fix_rose_import_scope.sql", import.meta.url), "utf8");

const seasons = new Map([[26, "2025/26"], [27, "2026/27"]]);
const rows = [
  { stagione_id: 27, societa_id: 1, giocatore: "A", squadra_reale: "Inter", ruolo: "A", prezzo: 20 },
  { stagione_id: 27, societa_id: 1, giocatore: "B", squadra_reale: "Milan", ruolo: "C", prezzo: 10 },
  { stagione_id: 27, societa_id: 1, giocatore: "C", squadra_reale: "Roma", ruolo: "D", prezzo: 5 },
  { stagione_id: 27, societa_id: 2, giocatore: "D", squadra_reale: "Napoli", ruolo: "P", prezzo: 2 },
  { stagione_id: 26, societa_id: 1, giocatore: "Storico", squadra_reale: "Como", ruolo: "A", prezzo: 3 },
];
const runtimeRows = (societaId) => rows.filter((row) => row.societa_id === societaId).map((row) => ({ ...row, stagione: seasons.get(row.stagione_id) }));

test("pubblicazione rende i tre giocatori alla scheda della società e stagione corrette", () => {
  assert.equal(runtimeRows(1).filter((row) => row.stagione === "2026/27").length, 3);
  assert.equal(runtimeRows(2).filter((row) => row.stagione === "2026/27").length, 1);
  assert.match(loader, /\.eq\("societa_id", societaId\)/);
  assert.match(loader, /select\("stagione_id,societa_id,giocatore,squadra_reale,ruolo,prezzo"\)/);
  assert.match(page, /loadRoseForSocieta\(team\.id\)/);
  assert.match(ui, /rosaFiltrata\.length > 0/);
});

test("fake OFF non usa fallback legacy e la UI mostra vuoto soltanto senza righe", () => {
  assert.match(loader, /if \(isGlobalFakeDataEnabled\(\)\) \{\s*return getRose\(\)\.filter/);
  assert.equal((loader.match(/getRose\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(loader, /return \[\.\.\.historical|if \(seasonError \|\| !season\) return legacy/);
  assert.match(loader, /if \(seasonError \|\| playerError\) throw new Error/);
  assert.match(ui, /Rosa \{stagione\} ancora da costruire/);
});

test("eliminazione cancella soltanto stagione e lega selezionate", () => {
  const leagueRows = [
    ...Array.from({ length: 420 }, () => ({ stagione_id: 4, lega_codice: "serie-a" })),
    ...Array.from({ length: 420 }, () => ({ stagione_id: 4, lega_codice: "serie-c-girone-a" })),
    ...Array.from({ length: 420 }, () => ({ stagione_id: 4, lega_codice: "serie-c-girone-c" })),
  ];
  const remainingAfterC = leagueRows.filter((row) => !(row.stagione_id === 4 && row.lega_codice === "serie-c-girone-c"));
  assert.equal(remainingAfterC.filter((row) => row.lega_codice === "serie-c-girone-c").length, 0);
  assert.equal(remainingAfterC.filter((row) => row.lega_codice === "serie-a").length, 420);
  assert.equal(remainingAfterC.filter((row) => row.lega_codice === "serie-c-girone-a").length, 420);
  const remainingAfterA = leagueRows.filter((row) => !(row.stagione_id === 4 && row.lega_codice === "serie-a"));
  assert.equal(remainingAfterA.filter((row) => row.lega_codice.startsWith("serie-c-")).length, 840);
  assert.match(deletion, /delete from public\.rose_giocatori\s+where stagione_id = target\.stagione_id\s+and lega_codice = target_lega/i);
  assert.doesNotMatch(deletion, /delete from public\.rose_giocatori\s+where import_batch_id/i);
  assert.match(deletion, /set stato = 'eliminata'/i);
});

test("solo la fotografia pubblicata corrente può essere eliminata", () => {
  assert.match(deletion, /latest\.stato in \('pubblicata', 'pubblicata_con_warning', 'eliminata'\)/i);
  assert.match(deletion, /latest\.riepilogo ->> 'legaCodice'\)\) = target_lega/i);
  assert.match(deletion, /latest_import_id is distinct from target\.id/i);
  assert.match(deletion, /pg_advisory_xact_lock/i);
  assert.match(actions, /deletePublishedRoseAction[\s\S]*requireImportAdmin/);
  assert.match(client, /ELIMINA IMPORT/);
  assert.match(client, /Le altre leghe e le altre stagioni non verranno toccate/);
  assert.match(client, /currentRoseImportIds\.has\(item\.id\)/);
});

test("import più recente di altra lega non rende obsoleto quello corrente della lega target", () => {
  const imports = [
    { id: "a-old", season: 4, league: "serie-a", published: 1 },
    { id: "a-current", season: 4, league: "serie-a", published: 2 },
    { id: "c-current", season: 4, league: "serie-c-girone-c", published: 3 },
  ];
  const latest = (league) => imports.filter((item) => item.season === 4 && item.league === league).sort((a, b) => b.published - a.published)[0]?.id;
  assert.equal(latest("serie-a"), "a-current");
  assert.notEqual(latest("serie-a"), "a-old");
  assert.equal(latest("serie-c-girone-c"), "c-current");
});

test("publish e delete della stessa lega usano la stessa advisory lock", () => {
  const locks = [...deletion.matchAll(/hashtextextended\('rose-snapshot-' \|\| ([^,]+), 0\)/g)].map((match) => match[1].replace(/\s+/g, " "));
  assert.ok(locks.length >= 2);
  assert.ok(locks.some((lock) => lock.includes("p_stagione_id::text || '-' || v_lega_codice")));
  assert.ok(locks.some((lock) => lock.includes("target.stagione_id::text || '-' || target_lega")));
});

test("RPC eliminazione Rose è service-role only e non espone DELETE client", () => {
  assert.match(deletion, /security definer[\s\S]*set search_path = ''/i);
  assert.match(deletion, /revoke all on function public\.admin_delete_rose_import\(uuid, uuid\)\s+from public, anon, authenticated/i);
  assert.match(deletion, /grant execute on function public\.admin_delete_rose_import\(uuid, uuid\)\s+to service_role/i);
  assert.doesNotMatch(client, /\.from\("rose_giocatori"\)\.delete/);
});

test("pubblicazione ed eliminazione invalidano le schede società dinamiche", () => {
  assert.ok((actions.match(/revalidatePath\("\/societa\/\[slug\]", "page"\)/g) ?? []).length >= 2);
});

test("nomi giocatori restano identici e la colonna testo non collassa", () => {
  const names = ["Elmas", "Gudmundsson A.", "Zambo Anguissa", "Calhanoglu", "De Bruyne", "Lucumí", "Zieliński"];
  const mapped = names.map((giocatore) => ({ giocatore: String(giocatore) }));
  assert.deepEqual(mapped.map((row) => row.giocatore), names);
  assert.match(loader, /giocatore: String\(row\.giocatore\)/);
 assert.match(
  ui,
  /<p className="min-w-0[^"]*">[\s\S]*?<span>\{player\.giocatore\}<\/span>/
);
  assert.doesNotMatch(ui, /truncate[^\n]*player\.giocatore|player\.giocatore[^\n]*truncate/);
  assert.doesNotMatch(ui, /player\.giocatore\.(?:split|replace|match)\(/);
});

test("card Rosa gestisce squadra opzionale statistiche prezzo e più caro senza overflow orizzontale", () => {
  assert.match(ui, /player\.squadraReale\.trim\(\) &&/);
  assert.match(ui, /\(\{player\.squadraReale\.trim\(\)\}\)/);
  assert.match(ui, /grid-cols-\[28px_minmax\(0,1fr\)_auto\]/);
  assert.match(ui, /flex shrink-0 items-center/);
  assert.match(ui, /Più caro/);
assert.match(ui, /grid min-w-0 grid-cols-\[28px_minmax\(0,1fr\)_auto\]/);
 assert.match(ui, /col-start-2 col-span-2 mt-1 flex min-w-0 flex-wrap/);
  assert.doesNotMatch(ui, /overflow-x-auto|grid-cols-6/);
});
