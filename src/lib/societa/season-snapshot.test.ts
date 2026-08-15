import assert from "node:assert/strict";
import test from "node:test";
import { deriveSocietaSeasonSnapshot } from "./season-snapshot.ts";
import type { LeagueData, Match, Team } from "../../app/campionati-live-preview/types.ts";
import { createChampionshipMockData } from "../../app/campionati-preview/mock-data.ts";
import { buildCoppaPrototype } from "../../app/coppe/coppa-fanta-fixture.ts";
import type { CurrentSocieta } from "./current.server.ts";

const team = (id: number): Team => ({ id, name: `Società ${id}`, logo: `/logo-${id}.png`, slug: `societa-${id}` });
const teams = [team(1), team(2)];
const match = (day: number, status: string, homeGoals: number | null, awayGoals: number | null): Match => ({ id: String(day), matchday: day, serieAMatchday: day, home: teams[0], away: teams[1], homeGoals, awayGoals, homeScore: homeGoals === null ? null : 65 + day, awayScore: awayGoals === null ? null : 64 + day, status });
const league = (id: LeagueData["id"], matches: Match[]): LeagueData => ({ id, competitionCode: id, name: id.replaceAll("-", " ").toUpperCase(), shortName: id, found: true, initialMatchday: 1, availableMatchdays: matches.map((item) => item.matchday), teams, matches });

test("pre-stagione mostra cinque fixture future senza risultati inventati", () => {
  const snapshot = deriveSocietaSeasonSnapshot(1, [league("serie-a", [1, 2, 3, 4, 5].map((day) => match(day, "programmata", null, null)))], null);
  assert.equal(snapshot.lastMatch, null); assert.equal(snapshot.nextMatch?.match.matchday, 1); assert.equal(snapshot.standing, null); assert.equal(snapshot.form.length, 5);
  assert.ok(snapshot.form.every((item) => item.outcome === null && item.score === null && item.isHome));
});

test("ultima, prossima, classifica e forma derivano dalle partite calcolate condivise", () => {
  const matches = [match(1, "calcolata", 2, 1), match(2, "calcolata", 1, 1), match(3, "calcolata", 0, 1), match(4, "programmata", null, null), match(5, "programmata", null, null)];
  const snapshot = deriveSocietaSeasonSnapshot(1, [league("serie-b", matches)], null);
  assert.equal(snapshot.lastMatch?.match.matchday, 3); assert.equal(snapshot.nextMatch?.match.matchday, 4); assert.deepEqual(snapshot.form.map(({ outcome, score }) => ({ outcome, score })), [{ outcome: "V", score: "2-1" }, { outcome: "P", score: "1-1" }, { outcome: "S", score: "0-1" }, { outcome: null, score: null }, { outcome: null, score: null }]); assert.equal(snapshot.standing?.played, 3);
});

test("dopo G1 completa con quattro future e dopo G5 conserva le cinque disputate più recenti", () => {
  const afterOne = deriveSocietaSeasonSnapshot(1, [league("serie-a", [match(1, "calcolata", 1, 0), ...[2, 3, 4, 5].map((day) => match(day, "programmata", null, null))])], null);
  assert.deepEqual(afterOne.form.map((item) => item.outcome), ["V", null, null, null, null]);
  const afterSix = deriveSocietaSeasonSnapshot(1, [league("serie-a", [1, 2, 3, 4, 5, 6].map((day) => match(day, "calcolata", day % 3, 1)))], null);
  assert.deepEqual(afterSix.form.map((item) => item.matchday), [2, 3, 4, 5, 6]);
});

test("risultato e casa trasferta sono sempre dal punto di vista della società", () => {
  const awayMatch = { ...match(1, "calcolata", 2, 3), home: teams[1], away: teams[0] };
  const snapshot = deriveSocietaSeasonSnapshot(1, [league("serie-a", [awayMatch])], null);
  assert.equal(snapshot.form[0].isHome, false); assert.equal(snapshot.form[0].opponent.id, 2); assert.equal(snapshot.form[0].score, "3-2"); assert.equal(snapshot.form[0].outcome, "V");
});

test("la forma contiene al massimo cinque risultati reali in ogni girone", () => {
  for (const id of ["serie-c-a", "serie-c-b", "serie-c-c"] as const) {
    const snapshot = deriveSocietaSeasonSnapshot(1, [league(id, [1, 2, 3, 4, 5, 6].map((day) => match(day, "calcolata", day % 2, 0)))], null);
    assert.equal(snapshot.form.length, 5); assert.equal(snapshot.leagueName, id.replaceAll("-", " ").toUpperCase());
  }
});

test("Coppa appare soltanto con calendario e almeno un risultato calcolato", () => {
  const futureCup = { teams, matches: [{ id: "c1", day: 1, home: teams[0], away: teams[1], homeGoals: null, awayGoals: null, homeScore: null, awayScore: null, status: "programmata" }], hasCalendar: true };
  assert.deepEqual(deriveSocietaSeasonSnapshot(1, [], futureCup).cups, []);
  const playedCup = { ...futureCup, matches: [{ ...futureCup.matches[0], homeGoals: 2, awayGoals: 0, homeScore: 70, awayScore: 62, status: "calcolata" }] };
  const cup = deriveSocietaSeasonSnapshot(1, [], playedCup).cups[0];
  assert.equal(cup.position, 1); assert.equal(cup.points, 3); assert.equal(cup.code, "coppa-fanta-20");
  assert.equal(cup.phase, "Accesso diretto agli Ottavi");
  const inProgress = deriveSocietaSeasonSnapshot(1, [], { ...playedCup, matches: [...playedCup.matches, { ...futureCup.matches[0], id: "c2", day: 2 }] }).cups[0];
  assert.equal(inProgress.phase, "Fase di qualificazione · Giornata 1");
  assert.doesNotMatch(inProgress.phase, /qualificat/i);
});

test("fixture condivise alimentano snapshot distinti per Serie A B e C con tutti i valori richiesti", () => {
  const catalog: CurrentSocieta[] = Array.from({ length: 60 }, (_, index) => {
    const id = index + 1;
    const category = id <= 20 ? "Serie A" : id <= 40 ? "Serie B" : "Serie C";
    return { id, nome: `Società demo ${id}`, nome_ufficiale: `Società demo ${id}`, nome_personalizzato: null, nome_normalizzato: `societa demo ${id}`, slug: `societa-demo-${id}`, fantallenatore: null, nickname_instagram: null, squadra_associata: null, stagione_ingresso: null, categoria: category, girone: category === "Serie C" ? "A" : null, logo_path: `/logo-${id}.png`, storia: null, storia_tifo: null, badge_tipo: null, attiva: true };
  });
  const leagues = createChampionshipMockData(catalog, 77, false).map((item): LeagueData => ({ id: item.id, competitionCode: item.id, name: item.name, shortName: item.shortName, found: true, initialMatchday: item.currentMatchday, availableMatchdays: Object.keys(item.matchdays).map(Number), teams: item.teams, matches: Object.entries(item.matchdays).flatMap(([day, rows]) => rows.map((row) => ({ ...row, matchday: Number(day), serieAMatchday: Number(day), status: row.homeGoals === null ? "programmata" : "calcolata" }))) }));
  const cupTeams = catalog.map((item) => ({ id: item.id, name: item.nome, slug: item.slug, logo: item.logo_path! }));
  const cupPrototype = buildCoppaPrototype(cupTeams, 77);
  const cupData = { teams: cupTeams, matches: cupPrototype.matches, hasCalendar: true };
  const snapshots = [1, 21, 41].map((id) => deriveSocietaSeasonSnapshot(id, leagues, cupData));
  for (const snapshot of snapshots) {
    assert.equal(snapshot.form.length, 5); assert.equal(snapshot.form.filter((item) => item.score !== null).length, 3); assert.ok(snapshot.form.filter((item) => item.score !== null).every((item) => /^\d+-\d+$/.test(item.score!)));
    assert.equal(snapshot.lastMatch?.match.matchday, 3); assert.equal(snapshot.nextMatch?.match.matchday, 4);
    assert.ok(snapshot.standing); assert.equal(typeof snapshot.standing?.points, "number"); assert.equal(typeof snapshot.standing?.fantasyPoints, "number");
    assert.equal(snapshot.cups.length, 1);
  }
  assert.equal(new Set(snapshots.map((snapshot) => `${snapshot.leagueName}-${snapshot.standing?.position}-${snapshot.standing?.fantasyPoints}`)).size, 3);
});
