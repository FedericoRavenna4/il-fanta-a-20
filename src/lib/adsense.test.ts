import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const ads = await readFile(new URL("../../public/ads.txt", import.meta.url), "utf8");

test("AdSense è un unico script HTML nativo nel head globale", () => {
  const head = layout.match(/<head>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, "il root layout deve contenere un head esplicito");
  assert.equal((layout.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) ?? []).length, 1);
  assert.match(layout, /const GOOGLE_ADSENSE_CLIENT = "ca-pub-6062997912590989"/);
  assert.match(
    head,
    /<script\s+async\s+src={`https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=\$\{GOOGLE_ADSENSE_CLIENT\}`}\s+crossOrigin="anonymous"\s*\/>/,
  );
});

test("AdSense non dipende da next/script né da attributi Next.js", () => {
  const adsenseIntegration = layout.match(
    /<script[\s\S]*?pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[\s\S]*?\/>/,
  )?.[0];
  assert.ok(adsenseIntegration, "integrazione AdSense non trovata");
  assert.doesNotMatch(adsenseIntegration, /<Script|strategy=|data-nscript/);
});

test("ads.txt contiene esattamente il seller Google richiesto", () => {
  assert.equal(ads, "google.com, pub-6062997912590989, DIRECT, f08c47fec0942fa0\n");
});

test("non sono state introdotte ad unit o inizializzazioni manuali", () => {
  assert.doesNotMatch(layout, /<ins|adsbygoogle\s*=|adsbygoogle[^\n]*\.push\s*\(/);
});
