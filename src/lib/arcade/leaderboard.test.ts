import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateArcadeLeaderboard, normalizeArcadeLevel, normalizeArcadePlayerName, normalizeArcadePlayerNameForLookup } from "./leaderboard.ts";
import type { ArcadeLeaderboardEntry } from "./types.ts";

const entry = (overrides: Partial<ArcadeLeaderboardEntry> = {}): ArcadeLeaderboardEntry => ({
  id: "entry-1",
  playerId: "11111111-1111-4111-8111-111111111111",
  nomeGiocatore: "Runner",
  societaId: 1,
  livello: 1,
  metri: 100,
  updatedAt: "2026-08-01T10:00:00.000Z",
  ...overrides,
});

test("nickname mantiene display e normalizza maiuscole e spazi solo per lookup", () => {
  assert.equal(normalizeArcadePlayerName("  Mario   Rossi  "), "Mario Rossi");
  assert.equal(normalizeArcadePlayerNameForLookup("  MARIO   Rossi  "), "mario rossi");
});

test("livelli Arcade restano limitati a 1, 2 e 3", () => {
  assert.deepEqual([normalizeArcadeLevel(1), normalizeArcadeLevel(2), normalizeArcadeLevel(3)], [1, 2, 3]);
  assert.equal(normalizeArcadeLevel(null), 1);
});

test("stesso Player ID conserva soltanto il record migliore", () => {
  const worse = entry({ id: "worse", livello: 2, metri: 900 });
  const best = entry({ id: "best", livello: 3, metri: 100 });
  assert.deepEqual(deduplicateArcadeLeaderboard([worse, best]), [best]);
});

test("un risultato peggiore non sostituisce il migliore allo stesso livello", () => {
  const best = entry({ id: "best", livello: 2, metri: 500 });
  const worse = entry({ id: "worse", livello: 2, metri: 499 });
  assert.deepEqual(deduplicateArcadeLeaderboard([best, worse]), [best]);
});

test("Player ID diversi non vengono uniti anche con lo stesso nickname", () => {
  const first = entry({ id: "first" });
  const second = entry({ id: "second", playerId: "22222222-2222-4222-8222-222222222222" });
  assert.equal(deduplicateArcadeLeaderboard([first, second]).length, 2);
});

test("cambiare nome o società non cambia l'identità del record Player ID", () => {
  const oldIdentity = entry({ id: "old", nomeGiocatore: "Vecchio", societaId: 1, metri: 200 });
  const renamed = entry({ id: "new", nomeGiocatore: "Nuovo", societaId: 99, metri: 300 });
  assert.deepEqual(deduplicateArcadeLeaderboard([oldIdentity, renamed]), [renamed]);
});
