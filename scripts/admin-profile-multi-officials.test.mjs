import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const migration = read("supabase", "migrations", "202608110002_admin_profiles_multi_officials.sql");
const baseline = read("supabase", "migrations", "202608100004_profile_verification_requests.sql");
const profilesMigration = read("supabase", "migrations", "202608070001_account_profiles.sql");
const account = read("src", "app", "account", "page.tsx");
const actions = read("src", "app", "account", "actions.ts");
const selfApprovalMigration = read("supabase", "migrations", "202608120001_admin_verification_self_approval.sql");
const proxy = read("src", "lib", "supabase", "proxy.ts");
const profile = read("src", "app", "user", "[username]", "page.tsx");
const adminAuth = read("src", "lib", "admin-import", "auth.server.ts");
const emblemMigration = read("supabase", "migrations", "202608100005_user_emblems.sql");

test("admin legacy completa un normale profilo sul proprio auth uid", () => {
  assert.match(migration, /create_my_legacy_profile/);
  assert.match(migration, /values \(auth\.uid\(\), pg_catalog\.btrim\(p_username\)/);
  assert.match(migration, /exists \(select 1 from public\.profiles where id = auth\.uid\(\)\)/);
  assert.match(actions, /validateAccountUsername/);
  assert.match(actions, /rpc\("create_my_legacy_profile"/);
  assert.match(account, /<CompleteProfileForm/);
  assert.doesNotMatch(account, /Account amministratore|Profilo pubblico non configurato/);
});

test("admin usa esclusivamente il login account normale", () => {
  assert.match(actions, /export async function loginAction/);
  assert.match(actions, /redirect\(profile\?\.username \? `\/user\/\$\{encodeURIComponent\(profile\.username\)\}` : "\/account"\)/);
  assert.match(proxy, /target\.pathname = "\/account\/accedi"/);
  assert.doesNotMatch(proxy, /\/admin\/login/);
});

test("Centro Admin è deciso server-side e visibile soltanto all'owner autorizzato", () => {
  assert.match(profile, /const adminAccess = owner \? await getAdminImportAccess\(\) : null/);
  assert.match(profile, /owner && adminAccess\?\.allowed && <Link data-admin-center href="\/admin"/);
  assert.match(adminAuth, /evaluateAdminIdentity\(email, process\.env\.ADMIN_IMPORT_EMAILS\)/);
  assert.doesNotMatch(profile, /localStorage|NEXT_PUBLIC_ADMIN|process\.env\.ADMIN_IMPORT_EMAILS/);
});

test("admin resta eleggibile per onboarding, Tifo, verifica ed emblemi", () => {
  assert.doesNotMatch(profile, /adminAccess.*ProfileSupportSelector|adminAccess.*ProfileEmblems/);
  assert.doesNotMatch(emblemMigration, /ADMIN_IMPORT_EMAILS|admin.*exclude|exclude.*admin/i);
  assert.match(profile, /profile\.societa_id === null/);
  assert.match(profile, /ProfilePathActions/);
  assert.match(profile, /ProfileEmblems/);
});

test("profiles societa_id non è unique e tre profili possono condividere la società", () => {
  assert.doesNotMatch(profilesMigration, /unique\s*\(\s*societa_id\s*\)|create unique index[^;]*societa_id/i);
  assert.doesNotMatch(migration, /team_already_verified|profiles where societa_id = v_request\.societa_id/);
  assert.match(migration, /update public\.profiles[\s\S]*where id = v_request\.profile_id and societa_id is null/);
  const profiles = [{ id: "A", societa_id: null }, { id: "B", societa_id: null }, { id: "C", societa_id: null }];
  for (const row of profiles) row.societa_id = 10;
  assert.deepEqual(profiles.map((row) => row.societa_id), [10, 10, 10]);
});

test("richieste sono indipendenti per società ma una sola pending per profilo", () => {
  assert.match(baseline, /unique index profile_verification_one_pending_per_profile[\s\S]*\(profile_id\)[\s\S]*status = 'pending'/);
  assert.doesNotMatch(baseline, /unique index[^;]*\(societa_id\)/i);
  assert.doesNotMatch(migration, /pg_advisory_xact_lock\(v_request\.societa_id/);
  assert.doesNotMatch(selfApprovalMigration, /self_review_not_allowed|v_request\.profile_id = p_reviewer_id/);
  assert.match(selfApprovalMigration, /grant execute[\s\S]*to service_role/);
});

test("un profilo mantiene al massimo una società e approvare non tocca altri profili", () => {
  assert.match(profilesMigration, /societa_id integer null references public\.societa/);
  assert.match(migration, /where id = v_request\.profile_id and societa_id is null/);
  assert.doesNotMatch(migration, /update public\.profiles[\s\S]*where societa_id = v_request\.societa_id/);
});
