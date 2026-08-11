import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoot = fileURLToPath(new URL("../src/", import.meta.url));
const runtimeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const suspicious = /Ã|Â|â€™|â€œ|â€|â€“|â€”|â€¦|â†|ï¿½|�/;

function runtimeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return runtimeFiles(path);
    return runtimeExtensions.has(extname(entry.name)) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

test("le sorgenti runtime UTF-8 non contengono mojibake", () => {
  const failures = runtimeFiles(runtimeRoot).filter((path) => suspicious.test(readFileSync(path, "utf8"))).map((path) => relative(root, path));
  assert.deepEqual(failures, []);
});

test("le copy italiane principali sono memorizzate correttamente", () => {
  const onboarding = readFileSync(new URL("../src/app/user/[username]/ProfileOnboarding.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../src/app/account/actions.ts", import.meta.url), "utf8");
  assert.match(onboarding, /Sei già tra le 100 società Fanta a 20\?/);
  assert.match(onboarding, /Sì, verifica il profilo/);
  assert.match(actions, /Non è stato possibile/);
});
