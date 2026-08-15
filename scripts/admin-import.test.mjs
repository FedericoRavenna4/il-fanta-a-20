import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { evaluateAdminIdentity, parseAdminEmailAllowlist } from "../src/lib/admin-import/auth-logic.ts";
import { MAX_IMPORT_FILE_BYTES, validateImportFile } from "../src/lib/admin-import/file-validation.ts";
import { assertPublishable, compareByLogicalKey, validateEditionSelection } from "../src/lib/admin-import/logic.ts";
import { assertHistoryQuerySucceeded, buildImportHistory } from "../src/lib/admin-import/history.ts";
import { calendarMatchKey, planCalendarReconciliation, planCalendarSynchronization } from "../src/lib/admin-import/calendar-sync.ts";
import { getCompetitionImportConfig } from "../src/lib/admin-import/competition-config.ts";

test("normalizza la allowlist e distingue sessione assente, autorizzata e negata", () => {
  assert.deepEqual([...parseAdminEmailAllowlist(" Admin@Example.COM, ,other@example.com ")], ["admin@example.com", "other@example.com"]);
  assert.equal(evaluateAdminIdentity(null, "admin@example.com"), "unauthenticated");
  assert.equal(evaluateAdminIdentity(" ADMIN@example.com ", "admin@example.com"), "authorized");
  assert.equal(evaluateAdminIdentity("intruso@example.com", "admin@example.com"), "unauthorized");
  assert.equal(evaluateAdminIdentity("admin@example.com", "  , "), "unauthorized");
});

test("accetta Excel e rifiuta dimensione o estensione non valide", () => {
  const file = { name: "Calendario.xlsx", size: 1024, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  assert.equal(validateImportFile(file), file);
  assert.throws(() => validateImportFile({ ...file, size: MAX_IMPORT_FILE_BYTES + 1 }), /10 MB/);
  assert.throws(() => validateImportFile({ name: "Calendario.html", size: 10, type: "text/html" }), /Formato non valido/);
});

test("classifica insert, update e unchanged senza cancellazioni", () => {
  const plan = compareByLogicalKey([{ id: 1, score: 1 }, { id: 2, score: 3 }, { id: 3, score: 0 }], [{ id: 1, score: 1 }, { id: 2, score: 2 }], ["id"], ["score"]);
  assert.deepEqual(plan.unchanged.map((row) => row.id), [1]);
  assert.deepEqual(plan.update.map((row) => row.id), [2]);
  assert.deepEqual(plan.insert.map((row) => row.id), [3]);
  assert.equal(Object.hasOwn(plan, "delete"), false);
});

test("impedisce doppia pubblicazione ed errori bloccanti", () => {
  assert.throws(() => assertPublishable("pubblicata", 0), /già pubblicata/);
  assert.throws(() => assertPublishable("anteprima", 1), /errori bloccanti/);
  assert.doesNotThrow(() => assertPublishable("validata", 0));
});

test("storico vuoto, record senza edizione e colonna warning singolare", () => {
  assert.deepEqual(buildImportHistory([], [], []), []);
  const result = buildImportHistory([{ id: "1", created_at: "2026-08-05", tipo: "rose", edizione_competizione_id: null, nome_file: "rose.xlsx", stato: "pubblicata", righe_inserite: 2, righe_aggiornate: 0, warning_count: 1, error_count: 0, riepilogo: {}, warning: [{ codice: "W" }], errori: [] }], [], []);
  assert.equal(result[0].competition, "Rose");
  assert.deepEqual(result[0].warningItems, [{ codice: "W" }]);
});

test("storico con record risolve la competizione associata", () => {
  const result = buildImportHistory([{ id: "2", created_at: "2026-08-05", tipo: "calendario_campionato", edizione_competizione_id: 10, nome_file: "cal.xlsx", stato: "anteprima", righe_inserite: 0, righe_aggiornate: 0, warning_count: 0, error_count: 0, riepilogo: {}, warning: [], errori: [] }], [{ id: 10, nome_edizione: "Serie A 2026/27", competizione_id: 3 }], [{ id: 3, nome: "Serie A" }]);
  assert.equal(result[0].competition, "Serie A");
});

test("storico lancia soltanto per un errore Supabase reale", () => {
  assert.doesNotThrow(() => assertHistoryQuerySucceeded(null));
  assert.throws(() => assertHistoryQuerySucceeded({ message: "permission denied", code: "42501", details: null, hint: null }), /Impossibile caricare lo storico/);
});

const editions = [
  { edizioneCompetizioneId: "101", stagioneId: "4", competizioneId: "1", competitionType: "campionato" },
  { edizioneCompetizioneId: 88, stagioneId: 3, competizioneId: 1, competitionType: "campionato" },
  { edizioneCompetizioneId: 205, stagioneId: 4, competizioneId: 6, competitionType: "coppa_nazionale" },
];

test("Serie A 2026/27 accetta ID numerici ricevuti come stringhe", () => {
  assert.deepEqual(validateEditionSelection({ seasonId: "4", editionCompetitionId: "101", importType: "calendario_campionato" }, editions), { seasonId: 4, editionCompetitionId: 101, competitionId: 1 });
});

test("non confonde competizione_id con edizione_competizione_id", () => {
  assert.throws(() => validateEditionSelection({ seasonId: 4, editionCompetitionId: 1, importType: "calendario_campionato" }, editions), /non appartiene/);
});

test("blocca edizione di altra stagione e campionato incompatibile con coppa", () => {
  assert.throws(() => validateEditionSelection({ seasonId: 4, editionCompetitionId: 88, importType: "calendario_campionato" }, editions), /non appartiene/);
  assert.throws(() => validateEditionSelection({ seasonId: 4, editionCompetitionId: 205, importType: "calendario_campionato" }, editions), /non è un campionato/);
});

test("azioni, pagina, storico e logout sono protetti e il client non espone service role", () => {
  const root = process.cwd();
  const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
  const client = read("src", "app", "admin", "importazioni", "ImportazioniClient.tsx");
  const actions = read("src", "app", "admin", "importazioni", "actions.ts");
  const page = read("src", "app", "admin", "importazioni", "page.tsx");
  const header = read("src", "app", "admin", "AdminHeader.tsx");
  const data = read("src", "lib", "admin-import", "data.server.ts");
  const authServer = read("src", "lib", "admin-import", "auth.server.ts");
  const accountActions = read("src", "app", "account", "actions.ts");
  const proxy = read("src", "lib", "supabase", "proxy.ts");
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
  assert.equal((actions.match(/requireImportAdmin\(\)/g) ?? []).length, 7);
  assert.match(actions, /inspectRoseDeletionAction[\s\S]*requireImportAdmin/);
  assert.match(actions, /deletePublishedRoseAction[\s\S]*requireImportAdmin/);
  assert.match(page, /redirect\("\/account\/accedi"\)/);
  assert.doesNotMatch(authServer, /auth\.signOut\(\)/);
  assert.equal((data.match(/requireImportAdmin\(\)/g) ?? []).length, 2);
  assert.match(data, /const supabase = await createAuthenticatedSupabaseClient\(\)/);
  assert.match(data, /process\.env\.NODE_ENV !== "development"/);
  assert.match(data, /if \(!imports\?\.length\) return \[\]/);
  assert.match(data, /riepilogo,errori,warning/);
  assert.doesNotMatch(data, /from\("competizioni"\)[\s\S]*?eq\("attiva"/);
  assert.match(data, /from\("edizioni_competizioni"\)[\s\S]*?eq\("attiva", true\)/);
  assert.match(data, /edizioneCompetizioneId:/);
  assert.match(data, /seasonId:/);
  assert.match(data, /competitionId:/);
  assert.match(client, /name="editionCompetitionId"/);
  assert.match(client, /value=\{editionCompetitionId\}/);
  assert.equal((client.match(/resetCompetitionSelection\(\)/g) ?? []).length, 3);
  assert.doesNotMatch(client, /formData\.set\("competitionId"/);
  assert.match(accountActions, /signInWithPassword/);
  assert.match(accountActions, /redirect\(returnTo \|\| \(profile\?\.username \? `\/user\/\$\{encodeURIComponent\(profile\.username\)\}` : "\/account"\)\)/);
  assert.match(proxy, /target\.pathname = "\/account\/accedi"/);
  assert.doesNotMatch(proxy, /\/admin\/login/);
  assert.doesNotMatch([client, actions, page, data].join("\n"), /ADMIN_IMPORT_DEV_MODE/);
  assert.match(page, /AdminHeader/); assert.match(page, /href="\/admin" linkLabel="Centro Admin"/);
  assert.doesNotMatch(page, /Carica, controlla e pubblica/);
  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto\]/); assert.match(header, /logoutAction/);
  assert.match(header, /username \|\| "Admin"/); assert.doesNotMatch(header, /\bemail\b|\{email\}/);
  assert.match(page, /username=\{access\.username\}/);
  assert.match(client, /window\.confirm\("Eliminare questa importazione\?/); assert.match(client, />ELIMINA</);
  assert.match(actions, /deleteImportAction/); assert.match(actions, /\["anteprima", "errore", "annullata"\]/);
  assert.match(actions, /admin_inspect_calendar_import/);
  assert.match(actions, /from\("partite"\).*import_batch_id/s); assert.match(actions, /from\("riposi_competizione"\).*import_batch_id/s);
  assert.match(actions, /from\("importazioni"\)\.delete\(\)/); assert.match(actions, /revalidatePath\("\/admin\/importazioni"\)/);
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|getSupabaseAdminClient|service_role/);
});

test("import Coppa espone vincoli 14x50 e valida tutto prima degli upsert", async () => {
  const client = fs.readFileSync(path.join(process.cwd(), "src/app/admin/importazioni/ImportazioniClient.tsx"), "utf8");
  const preview = fs.readFileSync(path.join(process.cwd(), "src/lib/admin-import/preview.server.ts"), "utf8");
  const config = fs.readFileSync(path.join(process.cwd(), "src/lib/admin-import/competition-config.ts"), "utf8");
  assert.match(client, />Coppe</);
  assert.match(config, /coppa-fanta-20[\s\S]*14 giornate · 700 partite · 100 società/);
  assert.match(client, /pronto per l’importazione/);
  assert.match(preview, /validateCoppaCalendarStructure\(parsed\)/);
  assert.ok(preview.indexOf("if (prepared.errors.length)") < preview.indexOf('.from("partite").upsert'));
  assert.match(preview, /planCalendarSynchronization/);
  assert.match(preview, /CALENDARIO_DIVERGENTE_CALCOLATO/);
  assert.match(preview, /PARTITA_OBSOLETA_CON_DIPENDENZE/);
  assert.match(preview, /fantabet_bets[\s\S]*fantabet_support_match_events/);
  assert.match(client, /Sincronizza calendario/);
  assert.match(client, /Importazione avvenuta con successo/);
  assert.match(client, /setTimeout\(\(\) => setSuccessToast\(""\), 4200\)/);
});

test("reimport sincronizza senza duplicati, preserva i calcolati e blocca divergenze storiche", () => {
  const row = (id, day, home, away, stato = "programmata", result = {}) => ({ id, edizione_competizione_id: 10, giornata_lega: day, societa_casa_id: home, societa_trasferta_id: away, stato, fantapunti_casa: null, fantapunti_trasferta: null, gol_casa: null, gol_trasferta: null, ...result });
  const incoming = [row(undefined, 1, 1, 2), row(undefined, 1, 3, 4)];
  let stored = [];
  const apply = (next) => {
    const plan = planCalendarSynchronization(next, stored);
    assert.equal(plan.obsoleteCalculated.length, 0);
    const removed = new Set(plan.obsoleteFuture.map((item) => item.id));
    const merged = new Map(stored.filter((item) => !removed.has(item.id)).map((item) => [calendarMatchKey(item), item]));
    plan.safeRows.forEach((item) => merged.set(calendarMatchKey(item), { ...item, id: merged.get(calendarMatchKey(item))?.id ?? merged.size + 1 }));
    stored = [...merged.values()];
  };
  apply(incoming);
  for (let count = 0; count < 5; count += 1) apply(incoming);
  assert.equal(stored.length, 2);
  apply([{ ...incoming[0], stato: "calcolata", fantapunti_casa: 66.5, fantapunti_trasferta: 65, gol_casa: 1, gol_trasferta: 0 }, incoming[1]]);
  assert.equal(stored.find((item) => item.societa_casa_id === 1).stato, "calcolata");
  apply(incoming);
  assert.equal(stored.find((item) => item.societa_casa_id === 1).gol_casa, 1);
  const futureChange = planCalendarSynchronization([incoming[0], row(undefined, 1, 3, 5)], stored);
  assert.equal(futureChange.obsoleteFuture.length, 1);
  const historicalChange = planCalendarSynchronization([row(undefined, 1, 1, 5), incoming[1]], stored);
  assert.equal(historicalChange.obsoleteCalculated.length, 1);
});

test("reimport identico preserva ID partita e riferimenti FantaBet e pronostici", () => {
  const fixture = [{ id: 91, edizione_competizione_id: 10, giornata_lega: 1, societa_casa_id: 1, societa_trasferta_id: 2, stato: "programmata", giornata_serie_a: 3 }];
  const bet = { id: 7, round_id: 4, partita_id: 91 };
  const prediction = { id: 12, bet_id: 7, profile_id: "profile" };
  let stored = fixture;
  for (let count = 0; count < 10; count += 1) {
    const incoming = [{ ...fixture[0], id: undefined, giornata_serie_a: count < 5 ? 3 : 4 }];
    const plan = planCalendarSynchronization(incoming, stored);
    stored = plan.safeRows.map((row) => ({ ...row, id: stored.find((current) => calendarMatchKey(current) === calendarMatchKey(row))?.id }));
  }
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, 91);
  assert.equal(bet.partita_id, stored[0].id);
  assert.equal(prediction.bet_id, bet.id);
});

test("modifica distruttiva collegata a FantaBet resta bloccante", () => {
  const old = { id: 1, edizione_competizione_id: 10, giornata_lega: 1, societa_casa_id: 1, societa_trasferta_id: 2, stato: "programmata" };
  const replacement = { id: 2, edizione_competizione_id: 10, giornata_lega: 1, societa_casa_id: 1, societa_trasferta_id: 3, stato: "programmata" };
  const plan = planCalendarReconciliation([replacement], [old, replacement], [{ id: 8, partita_id: 1 }]);
  assert.equal(plan.remappable.length, 0);
  assert.deepEqual(plan.manual, [{ dependencyId: 8, partitaId: 1, reason: "no_exact_target" }]);
});

test("cinque reimport conservano cardinalità 380 per Campionati e 700 per Coppa", () => {
  for (const expected of [380, 700]) {
    const incoming = Array.from({ length: expected }, (_, index) => ({ id: index + 1, edizione_competizione_id: expected, giornata_lega: Math.floor(index / (expected === 380 ? 10 : 50)) + 1, societa_casa_id: index * 2 + 1, societa_trasferta_id: index * 2 + 2, stato: "programmata" }));
    let stored = [];
    for (let count = 0; count < 5; count += 1) stored = planCalendarSynchronization(incoming, stored).safeRows;
    assert.equal(stored.length, expected);
    assert.equal(new Set(stored.map(calendarMatchKey)).size, expected);
  }
});

test("risanamento preserva il nuovo calendario e classifica le dipendenze senza perdere dati FantaBet", () => {
  const row = (id, day, home, away) => ({ id, edizione_competizione_id: 55, giornata_lega: day, societa_casa_id: home, societa_trasferta_id: away, stato: "programmata" });
  const shared = Array.from({ length: 12 }, (_, index) => row(index + 1, index + 1, index * 2 + 1, index * 2 + 2));
  const oldOnly = Array.from({ length: 368 }, (_, index) => row(13 + index, index % 38 + 1, 1000 + index * 2, 1001 + index * 2));
  const newOnly = Array.from({ length: 368 }, (_, index) => row(381 + index, index % 38 + 1, 2000 + index * 2, 2001 + index * 2));
  const target = [...shared, ...newOnly];
  const dependencies = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, partita_id: oldOnly[index].id }));
  const plan = planCalendarReconciliation(target, [...shared, ...oldOnly, ...newOnly], dependencies);
  assert.equal(plan.targetRows.length, 380);
  assert.equal(plan.obsoleteRows.length, 368);
  assert.equal(plan.remappable.length, 0);
  assert.equal(plan.manual.length, 25);
  assert.deepEqual(dependencies, Array.from({ length: 25 }, (_, index) => ({ id: index + 1, partita_id: oldOnly[index].id })));
});

test("rimappa soltanto una equivalenza logica 1:1 deterministica", () => {
  const old = { id: 1, edizione_competizione_id: 55, giornata_lega: 1, societa_casa_id: 10, societa_trasferta_id: 20, stato: "programmata" };
  const replacement = { ...old, id: 2 };
  const plan = planCalendarReconciliation([replacement], [old, replacement], [{ id: 9, partita_id: 1 }]);
  assert.deepEqual(plan.remappable, [{ dependencyId: 9, fromPartitaId: 1, toPartitaId: 2 }]);
  assert.equal(plan.manual.length, 0);
  assert.deepEqual(plan.obsoleteRows.map((row) => row.id), [1]);
});

test("validator strutturale Coppa è configurato soltanto per Coppa Fanta a 20", () => {
  assert.deepEqual(getCompetitionImportConfig("coppa-fanta-20")?.expectedStructure && { days: getCompetitionImportConfig("coppa-fanta-20").expectedStructure.days, matches: getCompetitionImportConfig("coppa-fanta-20").expectedStructure.matches, teams: getCompetitionImportConfig("coppa-fanta-20").expectedStructure.teams }, { days: 14, matches: 700, teams: 100 });
  assert.equal(getCompetitionImportConfig("champions-league"), undefined);
});

test("publish non maschera errori database come autorizzazione e delete resta admin-only", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "src/app/admin/importazioni/actions.ts"), "utf8");
  assert.doesNotMatch(actions, /Pubblicazione non autorizzata/);
  assert.match(actions, /publishImportAction[\s\S]*requireImportAdmin/);
  assert.match(actions, /inspectCalendarDeletionAction[\s\S]*requireImportAdmin/);
  assert.match(actions, /deletePublishedCalendarAction[\s\S]*requireImportAdmin/);
});

test("delete calendario è transazionale, auditabile e non eseguibile dal client", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202608140001_admin_delete_calendar_import.sql"), "utf8");
  const client = fs.readFileSync(path.join(process.cwd(), "src/app/admin/importazioni/ImportazioniClient.tsx"), "utf8");
  assert.match(sql, /^begin;/); assert.match(sql, /commit;\s*$/);
  assert.match(sql, /deleted_at[\s\S]*deleted_by[\s\S]*'eliminata'/);
  assert.match(sql, /p_acknowledge_calculated[\s\S]*calculated_count > 0/);
  assert.match(sql, /fantabet_dependency_count > 0[\s\S]*Eliminazione bloccata/);
  assert.match(sql, /delete from public\.fantabet_support_match_events[\s\S]*delete from public\.riposi_competizione[\s\S]*delete from public\.partite/);
  assert.match(sql, /revoke all on function[\s\S]*public, anon, authenticated/);
  assert.match(sql, /grant execute[\s\S]*service_role/);
  assert.match(sql, /admin_inspect_calendar_import/);
  assert.doesNotMatch(sql, /grant execute[^;]*admin_inspect_calendar_import[^;]*authenticated/i);
  assert.match(client, /role="dialog"[\s\S]*Elimina definitivamente/);
  assert.match(client, /Ho capito che risultati e fantapunteggi verranno eliminati definitivamente/);
  assert.match(client, /fantabetDependencies > 0/);
  assert.match(client, /Calendario eliminato con successo/);
});

test("DELETE calendario è concesso solo al backend service role", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202608140002_service_role_calendar_sync_delete.sql"), "utf8");
  assert.match(sql, /grant delete on table public\.partite to service_role/i);
  assert.match(sql, /revoke delete on table public\.partite from anon, authenticated/i);
  assert.doesNotMatch(sql, /grant delete[^;]*(?:anon|authenticated)/i);
});

test("reset FantaBet manuale azzera solo dati operativi e conserva emblemi e sistemi esterni", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/manual/20260814_fantabet_test_data_reset.sql"), "utf8");
  for (const table of ["fantabet_round_submissions", "fantabet_predictions", "fantabet_bets", "fantabet_rounds"]) assert.match(sql, new RegExp(`delete from public\\.${table}`));
  for (const table of ["profiles", "societa", "partite", "user_emblems", "user_emblem_unlocks", "profile_supports", "fantabet_support_match_events", "fantabet_support_bonus_events"]) assert.doesNotMatch(sql, new RegExp(`delete from public\\.${table}`));
  assert.match(sql, /^-- MANUAL ONE-TIME OPERATION/);
  assert.match(sql, /begin;[\s\S]*commit;/i);
});
