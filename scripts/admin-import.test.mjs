import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { evaluateAdminIdentity, parseAdminEmailAllowlist } from "../src/lib/admin-import/auth-logic.ts";
import { MAX_IMPORT_FILE_BYTES, validateImportFile } from "../src/lib/admin-import/file-validation.ts";
import { assertPublishable, compareByLogicalKey, validateEditionSelection } from "../src/lib/admin-import/logic.ts";
import { assertHistoryQuerySucceeded, buildImportHistory } from "../src/lib/admin-import/history.ts";

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
  assert.equal(result[0].competition, "—");
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
  const loginActions = read("src", "app", "admin", "login", "actions.ts");
  const loginClient = read("src", "app", "admin", "login", "LoginForm.tsx");
  const loginPage = read("src", "app", "admin", "login", "page.tsx");
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
  assert.equal((actions.match(/requireImportAdmin\(\)/g) ?? []).length, 3);
  assert.match(page, /redirect\("\/admin\/login"\)/);
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
  assert.match(loginActions, /auth\.signOut\(\)/);
  assert.match(loginActions, /revalidatePath\("\/admin\/login"/);
  assert.match(loginClient, /<form action=\{formAction\}/);
  assert.match(loginClient, /useFormStatus\(\)/);
  assert.match(loginClient, /disabled=\{pending\}/);
  assert.match(loginClient, /autoComplete="username"/);
  assert.match(loginClient, /autoComplete="current-password"/);
  assert.doesNotMatch(loginClient, /setTimeout|location\.reload|useRouter|router\.(push|replace)/);
  assert.match(loginActions, /signInWithPassword/);
  assert.match(loginActions, /redirect\("\/admin\/importazioni"\)/);
  assert.match(loginActions, /redirect\("\/admin\/login"\)/);
  assert.match(loginPage, /dynamic = "force-dynamic"/);
  assert.doesNotMatch(loginClient, /signUp|magic|otp/i);
  assert.doesNotMatch([client, actions, page, data].join("\n"), /ADMIN_IMPORT_DEV_MODE/);
  assert.match(page, /AdminHeader/); assert.match(page, /Vai a gestione FantaBet/);
  assert.doesNotMatch(page, /Carica, controlla e pubblica/);
  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto\]/); assert.match(header, /logoutAdminAction/);
  assert.match(header, /username \|\| "Admin"/); assert.doesNotMatch(header, /\bemail\b|\{email\}/);
  assert.match(page, /username=\{access\.username\}/);
  assert.match(client, /window\.confirm\("Eliminare questa importazione\?/); assert.match(client, />ELIMINA</);
  assert.match(actions, /deleteImportAction/); assert.match(actions, /\["anteprima", "errore", "annullata"\]/);
  assert.match(actions, /from\("partite"\).*import_batch_id/s); assert.match(actions, /from\("riposi_competizione"\).*import_batch_id/s);
  assert.match(actions, /from\("importazioni"\)\.delete\(\)/); assert.match(actions, /revalidatePath\("\/admin\/importazioni"\)/);
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|getSupabaseAdminClient|service_role/);
});
