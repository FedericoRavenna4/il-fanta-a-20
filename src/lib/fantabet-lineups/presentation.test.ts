import assert from "node:assert/strict";
import test from "node:test";
import { sortLineupPlayers } from "./presentation.ts";

const player = (order: number, role: string, name: string) => ({ order, role, name, captain: false, viceCaptain: false });

test("ordina visivamente P D C A preservando l'ordine interno al ruolo", () => {
  const incoming = [player(1, "C", "Barella"), player(2, "D", "Bremer"), player(3, "P", "Corvi"), player(4, "A", "Lautaro"), player(5, "D", "Bastoni"), player(6, "C", "Modric")];
  assert.deepEqual(sortLineupPlayers(incoming).map(({ name }) => name), ["Corvi", "Bremer", "Bastoni", "Barella", "Modric", "Lautaro"]);
  assert.deepEqual(incoming.map(({ name }) => name), ["Barella", "Bremer", "Corvi", "Lautaro", "Bastoni", "Modric"]);
});
