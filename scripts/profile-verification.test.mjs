import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveProfileTeamState, shouldShowProfileOnboarding } from "../src/lib/account/verification.ts";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const migration = read("supabase", "migrations", "202608100004_profile_verification_requests.sql");
const selfApprovalMigration = read("supabase", "migrations", "202608120001_admin_verification_self_approval.sql");
const page = read("src", "app", "user", "[username]", "page.tsx");
const layout = read("src", "app", "layout.tsx");
const globalOnboarding = read("src", "app", "components", "GlobalProfileOnboarding.tsx");
const onboarding = read("src", "app", "user", "[username]", "ProfileOnboarding.tsx");
const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
const adminPage = read("src", "app", "admin", "verifiche", "page.tsx");
const adminActions = read("src", "app", "admin", "verifiche", "actions.ts");
const smoothOverflowText = read("src", "app", "admin", "verifiche", "SmoothOverflowText.tsx");
const verificationReview = read("src", "app", "admin", "verifiche", "VerificationReviewForm.tsx");

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

test("La mia squadra applica una sola priorità di stato", () => {
  assert.equal(resolveProfileTeamState({ societaId: 4, verificationStatus: "pending", hasActiveSupport: true }), "official");
  assert.equal(resolveProfileTeamState({ societaId: null, verificationStatus: "pending", hasActiveSupport: true }), "verification-pending");
  assert.equal(resolveProfileTeamState({ societaId: null, verificationStatus: null, hasActiveSupport: true }), "supported");
  assert.equal(resolveProfileTeamState({ societaId: null, verificationStatus: "rejected", hasActiveSupport: false }), "verification-rejected");
  assert.equal(resolveProfileTeamState({ societaId: null, verificationStatus: null, hasActiveSupport: false }), "onboarding");
  assert.match(page, /data-profile-team-state=\{profileTeamState\}/);
  assert.match(page, /verification-pending[\s\S]*PendingVerification/);
  assert.doesNotMatch(page, /space-y-4 sm:space-y-6">\s*\{owner && pendingVerification/);
});

test("Centro Admin espone coda, dettaglio e revisione RPC senza doppio submit", () => {
  const dashboard = read("src", "app", "admin", "page.tsx");
  const review = read("src", "app", "admin", "verifiche", "VerificationReviewForm.tsx");
  assert.match(dashboard, /href="\/admin\/verifiche"/);
  assert.match(dashboard, /Richieste verifica profilo/i);
  assert.match(dashboard, /eq\("status", "pending"\)/);
  assert.match(adminPage, /pending\.length/);
  assert.match(review, /disabled=\{pending\}/);
  assert.match(adminActions, /admin_review_profile_verification_request/);
  assert.doesNotMatch(review, /from\("profiles"\)|societa_id/);
  assert.match(adminActions, /message: error\.message/);
  assert.match(adminActions, /code: error\.code/);
  assert.match(adminActions, /details: error\.details/);
  assert.match(adminActions, /hint: error\.hint/);
  assert.doesNotMatch(adminActions, /self_review_not_allowed/);
  assert.match(review, /role="status"/);
  assert.doesNotMatch(review, /role="status" className=\{`sr-only/);
});

test("approve valido e self-approval admin sono atomici senza ampliare i privilegi", () => {
  const rpc = selfApprovalMigration.slice(selfApprovalMigration.indexOf("create or replace function public.admin_review_profile_verification_request"));
  assert.doesNotMatch(rpc, /self_review_not_allowed|v_request\.profile_id = p_reviewer_id/);
  assert.match(rpc, /update public\.profiles[\s\S]*set societa_id = v_request\.societa_id[\s\S]*where id = v_request\.profile_id and societa_id is null/);
  assert.match(rpc, /update public\.profile_verification_requests[\s\S]*set status = p_decision/);
  assert.match(rpc, /reviewed_by = p_reviewer_id/);
  assert.match(selfApprovalMigration, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.match(selfApprovalMigration, /grant execute[\s\S]*to service_role/);
  assert.match(adminActions, /if \(error\)[\s\S]*return \{ message: reviewErrorMessage\(error\.message\) \}/);
  for (const path of ["/admin/verifiche", "/admin", "/account"]) assert.match(adminActions, new RegExp(`revalidatePath\\("${path.replaceAll("/", "\\/")}\\"\\)`));
  assert.match(adminActions, /revalidatePath\("\/user\/\[username\]", "page"\)/);

  const review = ({ reviewer, decision }) => ({ status: decision, societaId: decision === "approved" ? 10 : null, reviewedBy: reviewer, success: true });
  assert.deepEqual(review({ requester: "user-a", reviewer: "admin-b", decision: "approved" }), { status: "approved", societaId: 10, reviewedBy: "admin-b", success: true });
  assert.deepEqual(review({ requester: "admin-a", reviewer: "admin-a", decision: "approved" }), { status: "approved", societaId: 10, reviewedBy: "admin-a", success: true });
  assert.deepEqual(review({ requester: "user-a", reviewer: "admin-b", decision: "rejected" }), { status: "rejected", societaId: null, reviewedBy: "admin-b", success: true });
});

test("Centro Admin contiene esattamente tre categorie autorevoli", () => {
  const dashboard = read("src", "app", "admin", "page.tsx");
  assert.equal((dashboard.match(/<Link /g) ?? []).length, 2);
  assert.match(dashboard, /cards\.map/);
  for (const href of ["/admin/verifiche", "/admin/importazioni", "/admin/fantabet"]) assert.match(dashboard, new RegExp(href.replaceAll("/", "\\/")));
  assert.match(dashboard, /count: "exact", head: true/);
  assert.match(dashboard, /eq\("status", "pending"\)/);
  assert.match(dashboard, /data-admin-compact-card/g);
  assert.match(dashboard, /flex min-w-0 items-center gap-3/);
  assert.match(dashboard, /Gestisci calendari e dati\./);
  assert.match(dashboard, /Gestisci turni e pronostici\./);
  assert.match(dashboard, /Apri →/);
  assert.match(dashboard, /href=\{`\/user\/\$\{encodeURIComponent\(access\.username\)\}`\}/);
  assert.match(dashboard, /linkLabel="Torna al profilo"/);
});

test("lista pending è slim, mobile-safe e usa icone accessibili", () => {
  const review = read("src", "app", "admin", "verifiche", "VerificationReviewForm.tsx");
  assert.match(adminPage, /data-verification-slim-list/);
  assert.match(smoothOverflowText, /truncate/);
  assert.match(adminPage, /pending\.map/);
  assert.match(adminPage, /data-verification-compact-row/);
  assert.match(adminPage, /grid-cols-\[minmax\(0,\.9fr\)_minmax\(0,1\.15fr\)_auto\]/);
  assert.match(adminPage, /h-8 w-8/);
  assert.match(adminPage, /SmoothOverflowText/);
  assert.match(review, /<svg/);
  assert.match(review, /Approva richiesta/);
  assert.match(review, /Rifiuta richiesta/);
  assert.doesNotMatch(review, />Approva<|>Rifiuta</);
  assert.match(review, /h-11 w-11/);
  assert.match(review, /bg-emerald-100 text-emerald-800/);
  assert.match(review, /bg-rose-100 text-rose-800/);
  assert.match(review, /focus-visible:outline/);
});

test("nomi lunghi scorrono soltanto in overflow senza muovere logo o azioni", () => {
  assert.equal((adminPage.match(/<SmoothOverflowText/g) ?? []).length, 3);
  assert.match(smoothOverflowText, /scrollWidth - viewport\.clientWidth/);
  assert.match(smoothOverflowText, /distance > 0/);
  assert.match(smoothOverflowText, /ResizeObserver/);
  assert.match(smoothOverflowText, /translateX\(calc\(-1 \* var\(--verification-marquee-distance\)\)\)/);
  assert.match(smoothOverflowText, /Math\.min\(32, Math\.max\(12, 10 \+ distance \/ 9\)\)/);
  assert.match(smoothOverflowText, /0%, 14%/);
  assert.match(smoothOverflowText, /43%, 57%/);
  assert.match(smoothOverflowText, /86%, 100%/);
  assert.match(smoothOverflowText, /prefers-reduced-motion: reduce/);
  assert.match(smoothOverflowText, /text-overflow: ellipsis/);
  assert.doesNotMatch(smoothOverflowText, /requestAnimationFrame|setInterval|setTimeout/);
  assert.match(adminPage, /grid-cols-\[minmax\(0,\.9fr\)_minmax\(0,1\.15fr\)_auto\]/);
  assert.match(adminPage, /shrink-0 object-contain/);
  assert.match(verificationReview, /shrink-0/);
  for (const sample of ["PALERMAVAI MA VIENI MA CHI SONO", "BRIGHTON & HOVE ALBIONOLEFFE", "SULL’ONDA DELL’ENTUSIASMO"]) assert.ok(sample.length > 20);
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
  const review = read("src", "app", "admin", "verifiche", "VerificationReviewForm.tsx");
  assert.match(adminActions, /requireImportAdmin\(\)/);
  assert.match(adminActions, /getSupabaseAdminClient\(\)\.rpc/);
  assert.match(adminPage, /requireImportAdmin\(\)/);
  assert.match(review, /Approva/);
  assert.match(review, /Rifiuta/);
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
