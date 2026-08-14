import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DEMO_SEED, getDemoSeed, isGlobalFakeDataEnabled } from "./config.ts";
import { readFile } from "node:fs/promises";

test("fake data è opt-in e fail closed in produzione", () => {
  assert.equal(isGlobalFakeDataEnabled({ NODE_ENV: "development", F20_FAKE_DATA: undefined }), false);
  assert.equal(isGlobalFakeDataEnabled({ NODE_ENV: "development", F20_FAKE_DATA: "true" }), true);
  assert.equal(isGlobalFakeDataEnabled({ NODE_ENV: "production", F20_FAKE_DATA: "true" }), false);
});

test("le pagine demo sono reversibili e non invocano scritture Supabase", async () => {
  const [campionati, fantabet, coppa] = await Promise.all([
    readFile(new URL("../../app/campionati-live-preview/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/fantabet/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/coppe/MobileCoppeHub.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(campionati, /isGlobalFakeDataEnabled\(\)[\s\S]*createChampionshipMockData/);
  assert.match(fantabet, /globalDemo \? empty : await loadFantaBetPageData/);
  assert.match(coppa, /if \(isGlobalFakeDataEnabled\(\)\)[\s\S]*<CoppaFantaPrototype teams=\{teams\} demo/);
  assert.match(coppa, /loadActiveCoppaData\(\)/);
  assert.match(coppa, /loadError=\{loadError\}/);
  for (const source of [campionati, fantabet, coppa]) assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test("seed demo è deterministico e ha fallback stabile", () => {
  assert.equal(getDemoSeed("42"), 42);
  assert.equal(getDemoSeed("casuale"), DEFAULT_DEMO_SEED);
});
