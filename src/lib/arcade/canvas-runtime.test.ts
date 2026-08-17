import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runnerUrl = new URL("../../app/gioca/FantaRunner.tsx", import.meta.url);
const loaderUrl = new URL("../game/assetLoader.ts", import.meta.url);

test("cache canvas usa budget di pixel e prewarm solo viewport corrente", async () => {
  const source = await readFile(runnerUrl, "utf8");
  assert.match(source, /class PixelBudgetCanvasCache/);
  assert.match(source, /width \* value\.height|value\.width \* value\.height/);
  assert.match(source, /const viewports = \[currentViewport\]/);
  assert.doesNotMatch(source, /const viewports = \[[\s\S]*MOBILE_GAME_WIDTH[\s\S]*\]/);
});

test("resize, orientation, visualViewport e resume invalidano le cache", async () => {
  const source = await readFile(runnerUrl, "utf8");
  for (const event of ["resize", "orientationchange", "pageshow", "visibilitychange"]) {
    assert.match(source, new RegExp(`addEventListener\\(\\"${event}\\"`));
  }
  assert.match(source, /window\.visualViewport\?\.addEventListener\("resize"/);
  assert.match(source, /invalidateViewportRenderCaches\(\)/);
  assert.match(source, /configureMobileRuntime\(runtimeRef\.current, renderStateRef\.current, mobile\)/);
});

test("backing store segue client size e DPR e lo stato viene ripristinato", async () => {
  const source = await readFile(runnerUrl, "utf8");
  assert.match(source, /Math\.round\(rect\.width \* pixelRatio\)/);
  assert.match(source, /Math\.round\(rect\.height \* pixelRatio\)/);
  assert.match(source, /canvas\.width = pixelWidth/);
  assert.match(source, /context\.setTransform\(1, 0, 0, 1, 0, 0\)/);
  assert.match(source, /context\.globalAlpha = 1/);
  assert.match(source, /context\.globalCompositeOperation = "source-over"/);
  assert.match(source, /context\.filter = "none"/);
});

test("asset falliti hanno retry controllato e non restano cache morta", async () => {
  const source = await readFile(loaderUrl, "utf8");
  assert.match(source, /failedLoads/);
  assert.match(source, /retryAfter/);
  assert.match(source, /failedLoads\.delete\(key\)/);
  assert.match(source, /levelAssetPromises\.delete\(stage\)/);
});
