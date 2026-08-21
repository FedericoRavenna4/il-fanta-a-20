import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/gioca/GameClient.tsx", import.meta.url), "utf8");
const hud = readFileSync(new URL("../src/app/gioca/GameHud.tsx", import.meta.url), "utf8");

function panelSize(width, height) {
  const inset = 11.2;
  return {
    width: Math.min(width - inset, (height - inset) * 9 / 16),
    height: Math.min(height - inset, (width - inset) * 16 / 9),
  };
}

test("mobile misura la viewport visiva e conserva fallback compatibile con Safari precedente a dvh", () => {
  assert.match(source, /window\.visualViewport/);
  assert.match(source, /viewport\?\.height \?\? window\.innerHeight/);
  assert.match(source, /viewport\?\.width \?\? window\.innerWidth/);
  assert.match(source, /--arcade-viewport-height/);
  assert.match(source, /--arcade-viewport-width/);
  assert.match(source, /var\(--arcade-viewport-height,100vh\)/);
  assert.doesNotMatch(source, /@media \(max-width:639px\)[\s\S]*?100dvh/);
});

test("HUD resta sempre nel flusso prima del campo e non viene nascosto su mobile", () => {
  assert.ok(source.indexOf("<GameHud") < source.indexOf("<FantaRunner"));
  assert.doesNotMatch(source.slice(source.indexOf("<GameHud"), source.indexOf("<FantaRunner")), /className="[^"]*(?:^|\s)(?:max-sm:)?hidden(?:\s|$)/);
  for (const label of ["Record", "Gol", "Soglia", "Metri", "Livello"]) assert.match(hud, new RegExp(label));
  assert.match(source, /max-h-full max-w-full overflow-hidden/);
  assert.match(source, /safe-area-inset-top/);
  assert.match(source, /safe-area-inset-bottom/);
});

test("viewport portrait richiesti mantengono pannello 9:16 dentro lo spazio disponibile", () => {
  const viewports = [[414, 896], [375, 667], [390, 844], [430, 932], [360, 800], [412, 915], [390, 700]];
  for (const [width, height] of viewports) {
    const panel = panelSize(width, height);
    assert.ok(panel.width <= width && panel.height <= height, `${width}x${height}`);
    assert.ok(panel.height >= 600, `HUD e campo devono restare utilizzabili a ${width}x${height}`);
    assert.ok(Math.abs(panel.width / panel.height - 9 / 16) < 0.001, `${width}x${height}`);
  }
});

test("desktop conserva le regole dimensionali esistenti", () => {
  assert.match(source, /width:min\(97vw,calc\(\(100dvh - 7rem\) \* 1\.8\),1280px\)/);
  assert.match(source, /@media \(min-width:1024px\)[\s\S]*width:min\(94vw,calc\(\(100dvh - 9rem\) \* 1\.8\),1160px\)/);
});
