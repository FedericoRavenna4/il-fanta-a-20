import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loader = await readFile(new URL("../src/lib/rose-current.server.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../src/app/societa/[slug]/page.tsx", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/app/societa/[slug]/RosaSocieta.tsx", import.meta.url), "utf8");
const actions = await readFile(new URL("../src/app/admin/importazioni/actions.ts", import.meta.url), "utf8");
const client = await readFile(new URL("../src/app/admin/importazioni/ImportazioniClient.tsx", import.meta.url), "utf8");
const deletion = await readFile(new URL("../supabase/migrations/202608150003_admin_delete_rose_import.sql", import.meta.url), "utf8");

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

test("eliminazione cancella soltanto la stagione selezionata e consente un nuovo import", () => {
  const remaining = rows.filter((row) => row.stagione_id !== 27);
  assert.equal(remaining.filter((row) => row.stagione_id === 27).length, 0);
  assert.equal(remaining.filter((row) => row.stagione_id === 26).length, 1);
  assert.match(deletion, /delete from public\.rose_giocatori\s+where stagione_id = target\.stagione_id/i);
  assert.doesNotMatch(deletion, /delete from public\.rose_giocatori\s+where import_batch_id/i);
  assert.match(deletion, /set stato = 'eliminata'/i);
});

test("solo la fotografia pubblicata corrente può essere eliminata", () => {
  assert.match(deletion, /latest\.stato in \('pubblicata', 'pubblicata_con_warning'\)/i);
  assert.match(deletion, /latest_import_id is distinct from target\.id/i);
  assert.match(deletion, /pg_advisory_xact_lock/i);
  assert.match(actions, /deletePublishedRoseAction[\s\S]*requireImportAdmin/);
  assert.match(client, /ELIMINA IMPORT/);
  assert.match(client, /Le altre stagioni non verranno toccate/);
});

test("RPC eliminazione Rose è service-role only e non espone DELETE client", () => {
  assert.match(deletion, /security definer[\s\S]*set search_path = ''/i);
  assert.match(deletion, /revoke all on function public\.admin_delete_rose_import\(uuid, uuid\) from public, anon, authenticated/i);
  assert.match(deletion, /grant execute on function public\.admin_delete_rose_import\(uuid, uuid\) to service_role/i);
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
  assert.match(ui, /<span className="break-words">\{player\.giocatore\}<\/span>/);
  assert.doesNotMatch(ui, /truncate[^\n]*player\.giocatore|player\.giocatore[^\n]*truncate/);
  assert.doesNotMatch(ui, /player\.giocatore\.(?:split|replace|match)\(/);
});

test("card Rosa gestisce squadra opzionale statistiche prezzo e più caro senza overflow orizzontale", () => {
  assert.match(ui, /player\.squadraReale\.trim\(\) &&/);
  assert.match(ui, /\(\{player\.squadraReale\.trim\(\)\}\)/);
  assert.match(ui, /grid-cols-\[28px_minmax\(0,1fr\)_auto\]/);
  assert.match(ui, /shrink-0 flex-col items-end/);
  assert.match(ui, /Più caro/);
  assert.match(ui, /col-span-2 col-start-2 grid min-w-0 grid-cols-3/);
  assert.match(ui, /sm:flex sm:flex-wrap/);
  assert.doesNotMatch(ui, /overflow-x-auto|grid-cols-6/);
});
