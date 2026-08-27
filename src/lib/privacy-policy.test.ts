import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const privacy = await readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
const cookies = await readFile(new URL("../app/cookie-policy/page.tsx", import.meta.url), "utf8");
const footer = await readFile(new URL("../app/components/Footer.tsx", import.meta.url), "utf8");
const preferences = await readFile(new URL("../app/components/PrivacyPreferencesButton.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");

test("route Privacy e Cookie Policy descrivono i servizi realmente integrati", () => {
  for (const service of ["Google Analytics", "Google AdSense", "Supabase", "Vercel"]) assert.match(privacy, new RegExp(service));
  assert.match(cookies, /cookie necessari/); assert.match(cookies, /localStorage/); assert.match(cookies, /CMP Google/);
  assert.doesNotMatch(privacy, /I dati non vengono utilizzati per pubblicit.{1}, profilazione o cessione a terzi/);
  assert.match(sitemap, /path: "\/privacy"/); assert.match(sitemap, /path: "\/cookie-policy"/);
});

test("footer espone entrambe le policy e la gestione preferenze senza overflow", () => {
  assert.match(footer, /href="\/privacy"[\s\S]*Privacy Policy/); assert.match(footer, /href="\/cookie-policy"[\s\S]*Cookie Policy/);
  assert.match(footer, /PrivacyPreferencesButton/); assert.match(footer, /max-w-full/);
});

test("gestione preferenze richiama la revoca CMP quando disponibile con fallback informativo", () => {
  assert.match(preferences, /googlefc\.callbackQueue\.push\(googlefc\.showRevocationMessage\)/);
  assert.match(preferences, /\/cookie-policy#preferenze-privacy/);
});
