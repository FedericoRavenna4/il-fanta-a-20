import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shouldShowProfileOnboarding } from "../src/lib/account/verification.ts";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const migration = read("supabase", "migrations", "202608100004_profile_verification_requests.sql");
const page = read("src", "app", "user", "[username]", "page.tsx");
const layout = read("src", "app", "layout.tsx");
const globalOnboarding = read("src", "app", "components", "GlobalProfileOnboarding.tsx");
const onboarding = read("src", "app", "user", "[username]", "ProfileOnboarding.tsx");
const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
const adminPage = read("src", "app", "admin", "verifiche", "page.tsx");
const adminActions = read("src", "app", "admin", "verifiche", "actions.ts");

test("onboarding deriva solo dallo stato reale", () => {
  const base = { owner: true, societaId: null, hasActiveSupport: false, hasPendingVerification: false };
  assert.equal(shouldShowProfileOnboarding(base), true);
  assert.equal(shouldShowProfileOnboarding({ ...base, owner: false }), false);
  assert.equal(shouldShowProfileOnboarding({ ...base, societaId: 7 }), false);
  assert.equal(shouldShowProfileOnboarding({ ...base, hasActiveSupport: true }), false);
  assert.equal(shouldShowProfileOnboarding({ ...base, hasPendingVerification: true }), false);
  assert.doesNotMatch(onboarding, /localStorage|onboarding_seen|onboarding_completed/);
  assert.doesNotMatch(onboarding, /setOpen\(false\)|aria-label="Chiudi"/);
  assert.match(layout, /GlobalProfileOnboarding/);
  assert.match(globalOnboarding, /profile\.societa_id !== null/);
});

test("indietro e rifiuto non salvano stato definitivo", () => {
  assert.match(onboarding, /setStep\("choice"\)/);
  assert.match(onboarding, /Verifica non confermata/);
  assert.match(onboarding, /riprovare oppure scegliere una squadra da tifare/i);
  assert.doesNotMatch(onboarding, /href="\/account"/);
});

test("pending blocca onboarding e mostra stato dedicato", () => {
  assert.match(globalOnboarding, /verification\.data\?\.status === "pending"/);
  assert.match(page, /PendingVerification/);
  assert.match(onboarding, /In attesa di conferma/);
  assert.match(migration, /profile_supports_block_pending_verification/);
});

test("richieste protette e approvazione atomica", () => {
  assert.match(migration, /unique index profile_verification_one_pending_per_profile/);
  assert.match(migration, /profile_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on public\.profile_verification_requests from public, anon, authenticated/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(migration.match(/admin_review_profile_verification_request[\s\S]*?commit;/)?.[0] ?? "", /grant execute[\s\S]*authenticated/);
  assert.match(migration, /for update/);
  assert.match(migration, /update public\.profiles[\s\S]*set societa_id/);
  assert.match(migration, /status = p_decision[\s\S]*reviewed_by = p_reviewer_id/);
  assert.match(migration, /^begin;[\s\S]*commit;\s*$/);
});

test("onboarding globale separa scelta, warning e catalogo finale", () => {
  assert.match(onboarding, /data-global-onboarding/);
  assert.match(onboarding, /"support-warning"/);
  assert.match(onboarding, /setStep\("support-warning"\)/);
  assert.match(onboarding, /setStep\("support"\)/);
  assert.match(onboarding, /lockedOpen/);
  assert.match(selector, /!lockedOpen/);
  assert.match(onboarding, /Cerca la tua societ/);
  assert.doesNotMatch(onboarding, /contatto gi[aÃ]/i);
  assert.match(onboarding, /Sei già tra le 100 società Fanta a 20\?/);
  assert.match(onboarding, /Sì, verifica il profilo/);
  assert.match(onboarding, /No, scegli una squadra da tifare/);
  assert.match(onboarding, /event\.key === "Escape"\) event\.preventDefault\(\)/);
  assert.doesNotMatch(onboarding, /onClick=\{[^}]*setOpen\(false\)/);
});

test("admin usa allowlist e service role solo server", () => {
  assert.match(adminActions, /requireImportAdmin\(\)/);
  assert.match(adminActions, /getSupabaseAdminClient\(\)\.rpc/);
  assert.match(adminPage, /controconferma dal fantallenatore/i);
  assert.match(adminPage, /Approva/);
  assert.match(adminPage, /Rifiuta/);
});

test("verifica cerca soltanto il nome società e non espone fantallenatori", () => {
  assert.match(onboarding, /team\.name\.toLocaleLowerCase/);
  assert.match(onboarding, /placeholder="Nome società"/);
  assert.doesNotMatch(onboarding, /team\.manager|Nome società o fantallenatore|Fantallenatore non indicato/);
  assert.match(onboarding, /name="societaId"/);
  for (const label of ["Tutte", "A", "B", "C/A", "C/B", "C/C"]) assert.match(onboarding, new RegExp(`label: "${label.replace("/", "\\/")}"`));
  assert.match(onboarding, /team\.category === "Serie C"/);
  assert.match(onboarding, /team\.group/);
  assert.doesNotMatch(onboarding, /getSocieta|societa\.csv/);
});

test("verifica mobile resta nella viewport con risultati scrollabili", () => {
  assert.match(onboarding, /max-h-\[96dvh\]/);
  assert.match(onboarding, /data-verification-form[\s\S]*min-h-0 flex-1[\s\S]*overflow-hidden/);
  assert.match(onboarding, /data-verification-search-results[\s\S]*min-h-0 flex-1[\s\S]*overflow-y-auto/);
  assert.match(onboarding, /data-verification-league-filter[\s\S]*overflow-x-auto/);
});

test("ramo Tifo usa copy emozionale e catalogo finale non chiudibile", () => {
  assert.match(onboarding, /Scegli con cura e con il cuore/);
  assert.match(onboarding, />Torna indietro</);
  assert.match(onboarding, />Procedi</);
  assert.match(onboarding, /initiallyOpen lockedOpen/);
  assert.match(selector, /!lockedOpen/);
});

test("catalogo usa storia completa raggiungibile e warning", () => {
  assert.match(page, /team\.storia_tifo\?\.trim\(\)/);
  assert.match(selector, /max-h-40 touch-pan-y overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(selector, /line-clamp-6/);
  assert.match(selector, /⚠️ La scelta resterà valida/);
  assert.match(selector, /grid-cols-4/);
  assert.match(selector, /data-support-card-meta[\s\S]*text-\[8px\]/);
});

test("banner e avatar editor mantengono i requisiti", () => {
  const css = read("src", "app", "globals.css");
  const avatar = read("src", "app", "user", "[username]", "AvatarEditorModal.tsx");
  assert.match(css, /\[data-profile-header\][\s\S]*height:/);
  for (const token of ["zoom", "pointer", "Annulla", "Salva", "file"]) assert.match(avatar, new RegExp(token, "i"));
});
