import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FANTABET_ADMIN_SEASON, STANDARD_V1_POINTS, STANDARD_V1_TYPES, confirmedSubmissionsLabel, isAdminRoundEditable, mapAdminFantaBetSaveError, roundCompletion, validateAdminRound, type AdminRoundInput } from "./admin.ts";

function valid(): AdminRoundInput { return { stagioneId: 1, giornata: 7, opensAt: "2026-08-10T10:00:00.000Z", deadlineAt: "2026-08-12T10:00:00.000Z", bets: STANDARD_V1_TYPES.map((type, index) => ({ partitaId: index + 1, type, points: STANDARD_V1_POINTS[type], order: index + 1 })) }; }

test("admin valida cinque partite distinte e formato V1", () => { assert.deepEqual(validateAdminRound(valid()), []); const four = valid(); four.bets.pop(); assert.match(validateAdminRound(four).join(" "), /esattamente 5/); const duplicate = valid(); duplicate.bets[4].partitaId = 1; assert.match(validateAdminRound(duplicate).join(" "), /distinte/); const points = valid(); points.bets[0].points = 4; assert.match(validateAdminRound(points).join(" "), /punti/); });
test("admin valida stagione giornata e deadline strettamente successiva", () => { const input = valid(); input.stagioneId = 0; input.giornata = 0; input.deadlineAt = input.opensAt; const errors = validateAdminRound(input).join(" "); assert.match(errors, /stagione/); assert.match(errors, /giornata/); assert.match(errors, /deadline/); });
test("percentuale monitoraggio è derivata senza Auth", () => { assert.equal(roundCompletion(0, 0), 0); assert.equal(roundCompletion(4, 3), 75); });
test("schedine giocate mostra soltanto l'intero confermato", () => { assert.equal(confirmedSubmissionsLabel(0), "0"); assert.equal(confirmedSubmissionsLabel(1), "1"); assert.equal(confirmedSubmissionsLabel(49), "49"); });
test("round pubblicata è modificabile soltanto prima di opens_at", () => { const now = new Date("2026-08-10T10:00:00Z"); assert.equal(isAdminRoundEditable({ status: "pubblicata", opensAt: "2026-08-10T11:00:00Z" }, now), true); assert.equal(isAdminRoundEditable({ status: "pubblicata", opensAt: "2026-08-10T10:00:00Z" }, now), false); assert.equal(isAdminRoundEditable({ status: "bozza", opensAt: "2020-01-01T00:00:00Z" }, now), true); });

test("route usa autorizzazione e header admin condiviso", async () => { const page = await readFile(new URL("../../app/admin/fantabet/page.tsx", import.meta.url), "utf8"); const actions = await readFile(new URL("../../app/admin/fantabet/actions.ts", import.meta.url), "utf8"); const header = await readFile(new URL("../../app/admin/AdminHeader.tsx", import.meta.url), "utf8"); const auth = await readFile(new URL("../admin-import/auth.server.ts", import.meta.url), "utf8"); assert.match(page, /requireImportAdmin\(\).*redirect\("\/account\/accedi"\)/s); assert.match(actions, /await requireImportAdmin\(\)/); assert.match(page, /AdminHeader.*Gestione FantaBet.*username=\{access\.username\}.*Centro Admin/s); assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto\]/); assert.match(header, /username \|\| "Admin"/); assert.doesNotMatch(header, /\bemail\b/); assert.match(auth, /evaluateAdminIdentity[\s\S]*from\("profiles"\)\.select\("username"\)/); assert.doesNotMatch(page + actions, /ADMIN_IMPORT_EMAILS|auth\.users/); });
test("action delega editabilità atomica al DB e non bypassa trigger", async () => { const actions = await readFile(new URL("../../app/admin/fantabet/actions.ts", import.meta.url), "utf8"); const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8"); assert.match(actions, /rpc\("admin_save_fantabet_draft"/); assert.match(sql, /v_round\.status<>'bozza'.*v_round\.status='pubblicata'.*statement_timestamp\(\)<v_round\.opens_at/s); assert.match(actions, /update\(\{ status: "pubblicata" \}\).*eq\("status", "bozza"\)/s); assert.doesNotMatch(actions + sql, /disable.*trigger|session_replication_role/i); });
test("UI admin inizia con Compila la schedina e termina con Schedine pubblicate", async () => { const client = await readFile(new URL("../../app/admin/fantabet/AdminFantaBetClient.tsx", import.meta.url), "utf8"); for (const text of ["Compila la schedina", "Seleziona 5 partite", "Sposta su", "Sposta giù", "ANTEPRIMA", "PUBBLICA", "Schedine pubblicate", "Schedine giocate"]) assert.match(client, new RegExp(text, "i")); assert.doesNotMatch(client, /Round più recente|>NUOVA</); assert.ok(client.indexOf("Compila la schedina") < client.indexOf("Schedine pubblicate")); assert.equal(FANTABET_ADMIN_SEASON, "2026/27"); assert.match(client, /initial\.season\.label/); assert.match(client, /Array\.from\(\{ length: 38 \}/); assert.match(client, /SERIE C · GIRONE/); assert.match(client, /match\.league === league/); assert.match(client, /min=\{opensAt \|\| undefined\}/); assert.match(client, /sort\(\(a, b\) => a\.giornata - b\.giornata/); assert.match(client, /confirmedSubmissionsLabel\(round\.confirmed\)/); assert.doesNotMatch(client, /DeadlineCountdown|Tempo residuo|STANDARD V1/); });
test("Visualizza usa id round e storico è a selezione singola", async () => { const client = await readFile(new URL("../../app/admin/fantabet/AdminFantaBetClient.tsx", import.meta.url), "utf8"); assert.match(client, /href=\{`\/fantabet\?round=\$\{round\.id\}`\}/); assert.match(client, /selectedId.*onSelect/s); assert.doesNotMatch(client, /rounds\.map\(\(round\) => <article/); });
test("monitoraggio usa prediction e submission senza email", async () => { const server = await readFile(new URL("./admin.server.ts", import.meta.url), "utf8"); assert.match(server, /grouped\.set/); assert.match(server, /fantabet_round_submissions/); assert.match(server, /competizioni.*divisione_riferimento/s); assert.doesNotMatch(server, /auth\.users|select\([^)]*email/i); });
test("migrazione correttiva congela configurazione da opens_at", async () => { const sql = await readFile(new URL("../../../supabase/migrations/202608090001_fantabet_preopen_editing.sql", import.meta.url), "utf8"); assert.match(sql, /statement_timestamp\(\) < old\.opens_at/); assert.match(sql, /round_status = 'pubblicata' and statement_timestamp\(\) < round_opens_at/); assert.match(sql, /FANTABET_CONFIGURAZIONE_APERTA_IMMUTABILE/); assert.match(sql, /revoke all.*authenticated/is); });

test("eliminazione admin usa preview reale, conferma rafforzata e aggiornamento immediato", async () => {
  const client = await readFile(new URL("../../app/admin/fantabet/AdminFantaBetClient.tsx", import.meta.url), "utf8");
  for (const text of ["ELIMINA", "ELIMINA GIORNATA FANTABET", "Pronostici", "Utenti", "Submission", "ATTENZIONE", "Ho capito che verranno eliminate anche tutte le giocate collegate", "ELIMINA DEFINITIVAMENTE"]) assert.match(client, new RegExp(text, "i"));
  assert.match(client, /inspectFantaBetRoundDeletionAction/);
  assert.match(client, /setDeletedRoundIds/);
  assert.match(client, /router\.refresh\(\)/);
  assert.doesNotMatch(client, /window\.confirm\([^)]*[Ee]limina/);
});

test("RPC elimina qualunque stato con scope sul solo round e cascade atomica", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608140003_admin_delete_fantabet_round.sql", import.meta.url), "utf8");
  assert.match(sql, /create or replace function public\.admin_delete_fantabet_round\(p_round_id bigint\)/i);
  assert.match(sql, /for update/);
  assert.match(sql, /delete from public\.fantabet_rounds round\s+where round\.id = p_round_id/i);
  assert.doesNotMatch(sql, /where[^;]*status\s*(=|in)/i);
  assert.doesNotMatch(sql, /delete from public\.(partite|user_emblem_unlocks|profile_supports|fantabet_support)/i);
  assert.match(sql, /set_config\('f20\.admin_delete_fantabet_round', p_round_id::text, true\)/i);
  assert.match(sql, /^begin;[\s\S]*commit;\s*$/i);
});

test("preview conta giocate pronostici partecipanti e submission sul server", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608140003_admin_delete_fantabet_round.sql", import.meta.url), "utf8");
  assert.match(sql, /count\(distinct bet\.id\)/);
  assert.match(sql, /count\(distinct prediction\.id\)/);
  assert.match(sql, /count\(distinct prediction\.profile_id\)/);
  assert.match(sql, /count\(distinct \(submission\.profile_id, submission\.round_id\)\)/);
});

test("delete e preview sono service-role only e la Server Action verifica sempre l'admin", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608140003_admin_delete_fantabet_round.sql", import.meta.url), "utf8");
  const actions = await readFile(new URL("../../app/admin/fantabet/actions.ts", import.meta.url), "utf8");
  assert.match(sql, /revoke all on function public\.admin_delete_fantabet_round\(bigint\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_delete_fantabet_round\(bigint\) to service_role/i);
  assert.match(actions, /deleteFantaBetRoundAction[\s\S]*await requireImportAdmin\(\)/);
  assert.match(actions, /inspectFantaBetRoundDeletionAction[\s\S]*await requireImportAdmin\(\)/);
  assert.doesNotMatch(actions, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("round eliminata durante una sessione restituisce un errore pubblico controllato", async () => {
  const actions = await readFile(new URL("../../app/fantabet/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /Questa giornata FantaBet non è più disponibile\./);
  assert.match(actions, /NON_CONFERMABILE/);
  assert.match(actions, /NON_MODIFICABILE/);
});

test("round futura, in corso e conclusa usano la stessa cancellazione senza vincoli di stato", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608140003_admin_delete_fantabet_round.sql", import.meta.url), "utf8");
  for (const status of ["bozza", "pubblicata", "chiusa", "valutata"]) assert.doesNotMatch(sql, new RegExp(`p_round_id[^;]+status\\s*=\\s*'${status}'`, "is"));
  assert.match(sql, /delete from public\.fantabet_rounds round where round\.id = p_round_id/);
});

test("cancellazione preserva calendario, altri round, emblemi e Tifo", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608140003_admin_delete_fantabet_round.sql", import.meta.url), "utf8");
  assert.doesNotMatch(sql, /delete from public\.partite/i);
  assert.doesNotMatch(sql, /delete from public\.user_emblem_unlocks/i);
  assert.doesNotMatch(sql, /delete from public\.(profile_supports|fantabet_support_bonus_events|fantabet_support_match_events)/i);
  assert.doesNotMatch(sql, /stagione_id\s*=|numero_giornata\s*=/i);
});

test("scoring resta derivato dalle righe core eliminate e non crea un ledger persistito", async () => {
  const core = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  const visibility = await readFile(new URL("../../../supabase/migrations/202608100003_fantabet_base_leaderboard_visibility.sql", import.meta.url), "utf8");
  assert.match(core + visibility, /fantabet_prediction_results/);
  assert.match(core + visibility, /fantabet_round_evaluation/);
  assert.doesNotMatch(core + visibility, /create table public\.fantabet_(scores|scoring|leaderboard)/i);
});

test("salvataggio Admin usa una sola RPC atomica service-role", async () => {
  const actions = await readFile(new URL("../../app/admin/fantabet/actions.ts", import.meta.url), "utf8");
  const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8");
  const save = actions.slice(actions.indexOf("saveFantaBetDraftAction"), actions.indexOf("publishFantaBetRoundAction"));
  assert.match(save, /rpc\("admin_save_fantabet_draft"/);
  assert.doesNotMatch(save, /\.from\("fantabet_(rounds|bets)"\).*\.(insert|update|delete)\(/s);
  assert.match(sql, /^begin;[\s\S]*create or replace function public\.admin_save_fantabet_draft[\s\S]*commit;\s*$/i);
  assert.match(sql, /security definer[\s\S]*set search_path=''/i);
  assert.match(sql, /revoke all on function public\.admin_save_fantabet_draft[\s\S]*from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_save_fantabet_draft[\s\S]*to service_role/i);
});

test("RPC valida scope formato concorrenza rollback e idempotenza", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8");
  assert.match(sql, /pg_advisory_xact_lock[\s\S]*fantabet-scope-/);
  assert.match(sql, /pg_advisory_xact_lock[\s\S]*fantabet-round-/);
  assert.match(sql, /for update/);
  assert.match(sql, /updated_at is distinct from p_expected_updated_at[\s\S]*FANTABET_ROUND_MODIFICATA/);
  assert.match(sql, /jsonb_array_length\(p_bets\)<>5/);
  assert.match(sql, /count\(distinct \(item\.partita_id\)\)[\s\S]*<>5/);
  assert.match(sql, /edition\.stagione_id=p_stagione_id and game\.giornata_lega=p_numero_giornata/);
  assert.match(sql, /return query select p_round_id,v_round\.updated_at,true/);
  assert.match(sql, /delete from public\.fantabet_bets[\s\S]*insert into public\.fantabet_bets/);
  assert.doesNotMatch(sql, /exception when[\s\S]*commit|dblink|autonomous/i);
});

test("error code nuova RPC sono ASCII e il mapper riconosce giocate invalide", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8");
  const codes = [...sql.matchAll(/'(FANTABET_[^']+)'/g)].map((match) => match[1]);
  assert.ok(codes.length > 0);
  assert.ok(codes.every((code) => /^[\x20-\x7e]+$/.test(code)));
  assert.ok(codes.includes("FANTABET_GIOCATE_INVALIDE"));
  assert.equal(mapAdminFantaBetSaveError("FANTABET_GIOCATE_INVALIDE"), "Le cinque partite non rispettano la configurazione FantaBet.");
});

test("updated_at autorevole rende stale client A dopo il salvataggio di B", async () => {
  const core = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8");
  assert.match(core, /create or replace function public\.set_fantabet_updated_at\(\)[\s\S]*new\.updated_at := statement_timestamp\(\)/);
  assert.match(core, /create trigger fantabet_rounds_set_updated_at[\s\S]*before update on public\.fantabet_rounds[\s\S]*set_fantabet_updated_at/);
  const staleCheck = sql.indexOf("v_round.updated_at is distinct from p_expected_updated_at");
  const firstMutation = Math.min(sql.indexOf("update public.fantabet_rounds set"), sql.indexOf("delete from public.fantabet_bets"));
  assert.ok(staleCheck > 0 && staleCheck < firstMutation);
  assert.match(sql.slice(staleCheck, firstMutation), /FANTABET_ROUND_MODIFICATA/);
});

test("save identico ritorna unchanged senza cambiare updated_at o bets", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/202608220004_atomic_fantabet_draft.sql", import.meta.url), "utf8");
  const unchanged = sql.indexOf("return query select p_round_id,v_round.updated_at,true");
  const update = sql.indexOf("update public.fantabet_rounds set");
  const remove = sql.indexOf("delete from public.fantabet_bets");
  assert.ok(unchanged > 0 && unchanged < update && unchanged < remove);
});

test("Admin conserva la revisione e datetime impilati su mobile", async () => {
  const client = await readFile(new URL("../../app/admin/fantabet/AdminFantaBetClient.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./admin.server.ts", import.meta.url), "utf8");
  assert.match(server, /updated_at/);
  assert.match(client, /expectedUpdatedAt/);
  assert.match(client, /setExpectedUpdatedAt\(round\.updatedAt\)/);
  assert.match(client, /grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.doesNotMatch(client, /overflow-x-auto/);
});
