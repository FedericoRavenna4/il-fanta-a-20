import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const page = read("src", "app", "user", "[username]", "page.tsx");
const globalOnboarding = read("src", "app", "components", "GlobalProfileOnboarding.tsx");

function routeOutcome({ profile, profileError }) {
  if (profileError) return 500;
  if (!profile) return 404;
  return 200;
}

test("solo uno username realmente inesistente produce 404", () => {
  assert.equal(routeOutcome({ profile: null, profileError: null }), 404);
  assert.equal(routeOutcome({ profile: null, profileError: new Error("db unavailable") }), 500);
  assert.equal(routeOutcome({ profile: { username: "testesterno" }, profileError: null }), 200);
  assert.equal((page.match(/notFound\(\)/g) ?? []).length, 1);
  assert.ok(page.indexOf("if (profileError)") < page.indexOf("if (!profile) notFound()"));
});

test("enrichment opzionali non decidono l'esistenza del profilo", () => {
  const profileGate = page.slice(page.indexOf("const { data: profile"), page.indexOf("const [{ data: auth }"));
  for (const dependency of ["profile_verification_requests", "profile_supports", "public_profile_user_emblems", "getActiveSocietaCatalog"]) {
    assert.doesNotMatch(profileGate, new RegExp(dependency));
  }
  assert.match(page, /userEmblemsResult\.data \?\? \[\]/);
  assert.match(page, /supportResult\.data \?\? \[\]/);
  assert.match(page, /maybeSingle\(\)/);
});

test("profilo valido resta 200 con dati opzionali assenti o presenti", () => {
  const validProfile = { username: "testesterno", societa_id: null };
  for (const optionalState of [
    { support: null, verification: null, emblems: [] },
    { support: null, verification: null, emblems: [{ name: "Prima Bet" }] },
    { support: { societa_id: 1 }, verification: null, emblems: [] },
  ]) {
    assert.equal(routeOutcome({ profile: { ...validProfile, ...optionalState }, profileError: null }), 200);
  }
});

test("onboarding incompleto resta un profilo valido e apre solo il popup", () => {
  assert.match(globalOnboarding, /profile\.societa_id !== null/);
  assert.match(globalOnboarding, /if \(support\.data \|\| verification\.data\?\.status === "pending"\) return null/);
  assert.doesNotMatch(globalOnboarding, /notFound/);
});
