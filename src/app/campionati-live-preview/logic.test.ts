import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateGlobalMatchdayStats, calculateLeagueMatchdayStats, calculatePositionChanges, calculateStandings, deriveAvailableMatchdays, getLeagueRules, standingsAt } from "./logic.ts";
import type { Match, Team } from "./types.ts";

const team = (id: number, name = `Team ${id}`): Team => ({ id, name, logo: `/societa/${id}.png`, slug: `team-${id}` });
const match = (id: number, day: number, home: Team, away: Team, hg: number | null, ag: number | null, hs: number | null, as: number | null, status = "calcolata"): Match => ({ id: String(id), matchday: day, serieAMatchday: day, home, away, homeGoals: hg, awayGoals: ag, homeScore: hs, awayScore: as, status });
const [a, b, c] = [team(1, "Alfa"), team(2, "Beta"), team(3, "Gamma")];

test("classifica vuota e cinque leghe senza dati", () => {
  assert.deepEqual(calculateStandings([], []), []);
  assert.equal(Array.from({ length: 5 }, () => calculateStandings([], [])).every((rows) => rows.length === 0), true);
});

test("edizione senza numero_giornate e nessuna partita non inventano giornate", () => {
  const edition = { id: 10, competizioni: { codice: "serie-a" } };
  assert.equal("numero_giornate" in edition, false);
  assert.deepEqual(deriveAvailableMatchdays([]), []);
});

test("giornate disponibili provengono dalle partite, ordinate e anche non consecutive", () => {
  assert.deepEqual(deriveAvailableMatchdays([{ matchday: 9 }, { matchday: 1 }, { matchday: 4 }, { matchday: 9 }]), [1, 4, 9]);
});

test("query e tipi live non fanno riferimento alla colonna rimossa", async () => {
  const dataSource = await readFile(new URL("./data.ts", import.meta.url), "utf8");
  const databaseTypes = await readFile(new URL("../../lib/supabase/database.types.ts", import.meta.url), "utf8");
  assert.equal(dataSource.includes("numero_giornate"), false);
  assert.equal(/edizioni_competizioni:[\s\S]*?numero_giornate/.test(databaseTypes), false);
});

test("una giornata calcola vittoria, pareggio, sconfitta, gol, DR e fantapunti", () => {
  const rows = calculateStandings([a, b, c], [match(1, 1, a, b, 2, 1, 72.5, 66), match(2, 1, b, c, 0, 0, 60, 60)]);
  const alfa = rows.find((r) => r.id === a.id)!; const beta = rows.find((r) => r.id === b.id)!; const gamma = rows.find((r) => r.id === c.id)!;
  assert.deepEqual([alfa.points, alfa.won, alfa.goalsFor, alfa.goalsAgainst, alfa.goalDifference, alfa.fantasyPoints], [3, 1, 2, 1, 1, 72.5]);
  assert.deepEqual([beta.played, beta.won, beta.drawn, beta.lost, beta.points], [2, 0, 1, 1, 1]);
  assert.deepEqual([gamma.drawn, gamma.lost], [1, 0]);
});

test("più giornate e limite giornata", () => {
  const games = [match(1, 1, a, b, 0, 1, 60, 66), match(2, 2, a, b, 3, 0, 80, 55)];
  assert.equal(calculateStandings([a, b], games, 1)[0].id, b.id);
  assert.equal(calculateStandings([a, b], games, 2)[0].id, a.id);
});

test("ordinamento: punti, DR, gol fatti, fantapunti e nome", () => {
  const games = [match(1, 1, a, b, 2, 1, 60, 90), match(2, 1, c, team(4, "Delta"), 3, 2, 59, 50)];
  assert.deepEqual(calculateStandings([a, b, c, team(4, "Delta")], games).slice(0, 2).map((r) => r.id), [c.id, a.id]);
  assert.deepEqual(calculateStandings([a, b], []).map((r) => r.name), ["Alfa", "Beta"]);
});

test("variazioni di posizione e giornata 1", () => {
  const games = [match(1, 1, a, b, 0, 1, 60, 66), match(2, 2, a, b, 3, 0, 80, 55)];
  const rows = standingsAt([a, b], games, 2);
  assert.deepEqual(rows.map((r) => r.movement), [1, -1]);
  assert.deepEqual(calculatePositionChanges(calculateStandings([a, b], games, 1), [], 1).map((r) => r.movement), [0, 0]);
});

test("statistiche migliori, peggiori e partita con più gol con tie-break fantapunti", () => {
  const games = [match(1, 1, a, b, 2, 2, 70, 60), match(2, 1, b, c, 3, 1, 80, 55)];
  const league = calculateLeagueMatchdayStats(games, 1); const global = calculateGlobalMatchdayStats(games, 1);
  assert.equal(league.best?.score, 80); assert.equal(league.worst?.score, 55); assert.equal(global.highestScoringMatch?.id, "2");
});

test("giornata futura e valori null non diventano risultati o 0-0", () => {
  const future = match(1, 2, a, b, null, null, null, null, "programmata");
  assert.equal(calculateStandings([a, b], [future]).every((r) => r.played === 0), true);
  assert.deepEqual(calculateLeagueMatchdayStats([future], 2), { best: null, worst: null });
});

test("regole Serie A, B e C", () => {
  assert.equal(getLeagueRules("serie-a", 18).relegated, true);
  assert.deepEqual(getLeagueRules("serie-b", 3), { promoted: true, relegated: false, scattoPromozione: false });
  assert.equal(getLeagueRules("serie-b", 17).relegated, true);
  assert.deepEqual(getLeagueRules("serie-c-a", 1), { promoted: true, relegated: false, scattoPromozione: true });
  assert.equal(getLeagueRules("serie-c-c", 5).scattoPromozione, true);
});

test("i link società usano lo slug esistente in tutti i blocchi UI", async () => {
  const source = await readFile(new URL("./live-client.tsx", import.meta.url), "utf8");
  assert.ok((source.match(/href={`\/societa\/\$\{team\.slug\}`}|href={`\/societa\/\$\{row\.slug\}`}/g)?.length ?? 0) >= 5);
});
