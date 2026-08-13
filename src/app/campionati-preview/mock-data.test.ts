import test from "node:test";
import assert from "node:assert/strict";
import { createChampionshipMockData } from "./mock-data.ts";
import type { CurrentSocieta } from "@/lib/societa/current.server";

const league = (index: number) => index < 20 ? ["Serie A", null] : index < 40 ? ["Serie B", null] : index < 60 ? ["Serie C - Girone A", null] : index < 80 ? ["Serie C", "Girone B"] : ["Serie C - Girone C", null];
const catalog = Array.from({ length: 100 }, (_, index) => { const [categoria, girone] = league(index); return { id: index + 1, nome: `Società ${index + 1}`, slug: `societa-${index + 1}`, logo_path: `/societa/${index + 1}.png`, categoria, girone } as CurrentSocieta; });

test("fake Campionati popola risultati e classifiche di tutte le cinque leghe", () => {
  const data = createChampionshipMockData(catalog, 1234, true);
  assert.equal(data.length, 5);
  for (const item of data) {
    assert.equal(item.teams.length, 20);
    assert.equal(Object.keys(item.matchdays).length, 38);
    assert.equal(Object.values(item.matchdays).flat().length, 380);
    assert.ok(Object.values(item.matchdays).flat().every((match) => match.homeGoals !== null && match.awayGoals !== null && match.homeScore !== null && match.awayScore !== null));
  }
});

test("fixture Campionati è deterministica e alimenta MVP Goleada e Disastro", () => {
  const first = createChampionshipMockData(catalog, 77, true);
  const second = createChampionshipMockData(catalog, 77, true);
  assert.deepEqual(first, second);
  const matches = first.flatMap((item) => Object.values(item.matchdays).flat());
  assert.ok(matches.some((match) => match.homeGoals! + match.awayGoals! > 0));
  assert.ok(matches.some((match) => match.homeScore !== match.awayScore));
});
