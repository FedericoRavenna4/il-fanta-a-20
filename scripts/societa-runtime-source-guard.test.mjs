import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const sourceRoots = ["src/app", "src/components", "src/lib"];
const legacyModule = path.normalize("src/lib/societa-legacy.ts");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function runtimeFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return runtimeFiles(absolute);
    const relative = path.normalize(path.relative(root, absolute));
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name) || relative === legacyModule) return [];
    return [relative];
  });
}

test("runtime society identity cannot regress to the legacy CSV loader", () => {
  const violations = sourceRoots.flatMap((directory) => runtimeFiles(path.join(root, directory))).flatMap((file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const reasons = [
      /\bgetSocieta\s*\(/.test(source) && "getSocieta()",
      /(?:from\s+["'][^"']*societa-legacy["']|require\s*\([^)]*societa-legacy)/.test(source) && "legacy loader import",
      /data[/\\]societa\.csv|["']societa\.csv["']/.test(source) && "direct societa.csv read",
    ].filter(Boolean);
    return reasons.map((reason) => `${file}: ${reason}`);
  });

  assert.deepEqual(violations, []);
});
