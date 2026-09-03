import assert from "node:assert/strict";
import test from "node:test";
import { matchPlayer } from "./logic.ts";
import { loadAllPages, POSTGREST_PAGE_SIZE } from "./pagination.ts";

test("pagina un catalogo oltre il limite PostgREST senza perdere righe", async () => {
  const source = Array.from({ length: 2_100 }, (_, index) => ({ id: index + 1 }));
  const ranges: Array<[number, number]> = [];
  const rows = await loadAllPages(async (from, to) => {
    ranges.push([from, to]);
    return source.slice(from, to + 1);
  });

  assert.equal(POSTGREST_PAGE_SIZE, 1_000);
  assert.equal(rows.length, 2_100);
  assert.equal(rows.at(-1)?.id, 2_100);
  assert.deepEqual(ranges, [[0, 999], [1_000, 1_999], [2_000, 2_999]]);
});

test("un giocatore oltre la prima pagina resta disponibile al matching e al catalogo", async () => {
  const source = Array.from({ length: 2_100 }, (_, index) => ({
    id: index + 1,
    name: index === 2_099 ? "Zvonimir Ultimo" : `Giocatore ${index + 1}`,
    role: "C",
    societyId: index === 2_099 ? 7 : 8 + (index % 99),
    societyName: index === 2_099 ? "Società A" : "Altra società",
  }));
  const catalog = await loadAllPages(async (from, to) => source.slice(from, to + 1));
  const matchRoster = source.filter((player) => player.societyId === 7);

  assert.equal(catalog.find((player) => player.id === 2_100)?.name, "Zvonimir Ultimo");
  assert.equal(matchPlayer("Zvonimir U.", matchRoster).playerId, 2_100);
});
