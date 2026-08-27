import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const ads = await readFile(new URL("../../public/ads.txt", import.meta.url), "utf8");

test("AdSense è globale una sola volta con publisher esatto e caricamento non bloccante", () => {
  assert.equal((layout.match(/id="google-adsense"/g) ?? []).length, 1);
  assert.equal((layout.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) ?? []).length, 1);
  assert.match(layout, /const GOOGLE_ADSENSE_CLIENT = "ca-pub-6062997912590989"/);
  assert.match(layout, /async[\s\S]*crossOrigin="anonymous"[\s\S]*strategy="afterInteractive"/);
});

test("ads.txt contiene esattamente il seller Google richiesto", () => {
  assert.equal(ads, "google.com, pub-6062997912590989, DIRECT, f08c47fec0942fa0\n");
});

test("non sono state introdotte ad unit o inizializzazioni manuali", () => {
  assert.doesNotMatch(layout, /<ins|adsbygoogle\s*=|adsbygoogle[^\n]*\.push\s*\(/);
});
