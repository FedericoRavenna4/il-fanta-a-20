import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/202608210001_arcade_user_emblems.sql", import.meta.url), "utf8");
const emblemIds = { "insert-coin": 5, "salto-di-qualita": 6, "top-player": 11, ingiocabile: 16 };

function sync(scores, existing = new Set()) {
  const unlocks = new Set(existing);
  const ranked = scores
    .filter((score) => score.profileId !== null)
    .toSorted((left, right) =>
      (right.level - left.level)
      || (right.meters - left.meters)
      || (left.updatedAt - right.updatedAt)
      || (left.createdAt - right.createdAt)
      || (left.id - right.id));
  for (const score of ranked) {
    unlocks.add(`${score.profileId}:${emblemIds["insert-coin"]}`);
    if (score.level >= 2) unlocks.add(`${score.profileId}:${emblemIds["salto-di-qualita"]}`);
  }
  ranked.slice(0, 10).forEach((score) => unlocks.add(`${score.profileId}:${emblemIds["top-player"]}`));
  if (ranked[0]) unlocks.add(`${ranked[0].profileId}:${emblemIds.ingiocabile}`);
  return unlocks;
}

const score = (id, profileId, level, meters) => ({ id, profileId, level, meters, updatedAt: id, createdAt: id });

test("migration usa gli ID e slug Arcade reali", () => {
  for (const [slug, id] of Object.entries(emblemIds)) assert.match(migration, new RegExp(`emblem\\.id = ${id} and emblem\\.slug = '${slug}'`));
});

test("livello 1 sblocca Insert Coin e livello 2 anche Salto di Qualità", () => {
  const unlocks = sync([score(1, "level-1", 1, 100), score(2, "level-2", 2, 100)]);
  assert.ok(unlocks.has("level-1:5"));
  assert.ok(!unlocks.has("level-1:6"));
  assert.ok(unlocks.has("level-2:5"));
  assert.ok(unlocks.has("level-2:6"));
});

test("posizione 10 sblocca Top Player, posizione 11 no, posizione 1 sblocca entrambi", () => {
  const scores = Array.from({ length: 11 }, (_, index) => score(index + 1, `p${index + 1}`, 1, 1100 - index));
  const unlocks = sync(scores);
  assert.ok(unlocks.has("p1:11"));
  assert.ok(unlocks.has("p1:16"));
  assert.ok(unlocks.has("p10:11"));
  assert.ok(!unlocks.has("p11:11"));
  assert.ok(!unlocks.has("p2:16"));
});

test("unlock resta dopo perdita posizione e rerun non duplica", () => {
  const initial = sync([score(1, "former-first", 1, 1000), score(2, "challenger", 1, 900)]);
  const afterLoss = sync([score(1, "former-first", 1, 1000), score(2, "challenger", 2, 1200)], initial);
  assert.ok(afterLoss.has("former-first:16"));
  assert.equal(sync([score(1, "former-first", 1, 1000), score(2, "challenger", 2, 1200)], afterLoss).size, afterLoss.size);
});

test("record legacy senza profile_id viene ignorato", () => {
  assert.equal(sync([score(1, null, 3, 9999)]).size, 0);
});

test("trigger statement-level, sicurezza e backfill sono presenti", () => {
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /after insert or update of livello, metri, profile_id[\s\S]*for each statement/i);
  assert.match(migration, /on conflict \(profile_id, emblem_id\) do nothing/gi);
  assert.match(migration, /select private\.sync_arcade_user_emblems\(\);/i);
  assert.match(migration, /revoke all on function private\.sync_arcade_user_emblems\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.sync_arcade_user_emblems\(\)[\s\S]*to service_role/i);
});
