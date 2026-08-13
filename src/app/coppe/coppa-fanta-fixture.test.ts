import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCoppaPrototype, coppaStandingsForRange, qualificationFor, qualificationSeparators, sortCoppaStandings, type CoppaTeam } from "./coppa-fanta-fixture.ts";

const teams: CoppaTeam[] = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, name: `Società ${index + 1}`, slug: `societa-${index + 1}`, logo: `/logo-${index + 1}.png` }));

test("fixture Coppa genera 14 giornate, 50 partite e 100 righe senza inventare squadre", () => {
  const data = buildCoppaPrototype(teams);
  assert.equal(data.matches.length, 700);
  for (let day = 1; day <= 14; day += 1) assert.equal(data.matches.filter((match) => match.day === day).length, 50);
  assert.equal(data.standings.length, 100);
  assert.equal(Object.keys(data.standingsByDay).length, 14);
  assert.notDeepEqual(data.standingsByDay[1].map((row) => row.totalPoints), data.standingsByDay[14].map((row) => row.totalPoints));
  assert.deepEqual(new Set(data.standings.map((row) => row.id)), new Set(teams.map((team) => team.id)));
});

test("sorting è soltanto visuale e conserva POS ufficiale", () => {
  const rows = buildCoppaPrototype(teams).standingsByDay[14];
  const sorted = sortCoppaStandings(rows, "goalsAgainst", "asc");
  assert.deepEqual(sorted.map((row) => row.position).sort((a, b) => a - b), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.ok(sorted.every((row, index) => index === 0 || sorted[index - 1].goalsAgainst <= row.goalsAgainst));
});

test("range 1-14 e intervalli intermedi aggregano solo le giornate selezionate", () => {
  const data = buildCoppaPrototype(teams, 99);
  const full = coppaStandingsForRange(teams, data.matches, 1, 14);
  const middle = coppaStandingsForRange(teams, data.matches, 4, 9);
  assert.equal(full.every((row) => row.won + row.drawn + row.lost === 14), true);
  assert.equal(middle.every((row) => row.won + row.drawn + row.lost === 6), true);
  assert.notDeepEqual(full.map((row) => row.totalPoints), middle.map((row) => row.totalPoints));
});

test("separatori sono collocati dopo 8, 16, 24, 32 e 64", () => {
  assert.deepEqual([...qualificationSeparators.keys()], [8, 16, 24, 32, 64]);
});

test("fasce qualificazione coprono esattamente 1-100", () => {
  assert.equal(qualificationFor(1).short, "OTTAVI"); assert.equal(qualificationFor(9).short, "SEDIC.");
  assert.equal(qualificationFor(17).short, "32ESIMI"); assert.equal(qualificationFor(25).short, "3°T PO");
  assert.equal(qualificationFor(33).short, "1°T PO"); assert.equal(qualificationFor(65).short, "OUT"); assert.equal(qualificationFor(100).short, "OUT");
});

test("UI ricerca su tutte le righe e mantiene top 20 con modal completa senza overflow", async () => {
  const source = await readFile(new URL("./CoppaFantaPrototype.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./MobileCoppeHub.tsx", import.meta.url), "utf8");
  assert.match(source, /searchedStandings\.slice\(0, 20\)/); assert.match(source, /normalizedStandingSearch \? searchedStandings : searchedStandings\.slice/);
  assert.match(source, /Cerca squadra\.\.\./); assert.match(source, /Espandi classifica/); assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /overflow-x-hidden/); assert.match(source, /grid-cols-\[38px_minmax\(0,1fr\)_40px_58px\]/);
  assert.doesNotMatch(source, /min-w-\[720px\]/); assert.match(source, /overflow-y-auto overflow-x-hidden/);
  assert.match(server, /getActiveSocietaCatalog/); assert.match(server, /team\.nome[\s\S]*team\.slug[\s\S]*team\.logo_path/);
});

test("Coppa replica tab, slider, gerarchia risultati e colori solo agli estremi", async () => {
  const source = await readFile(new URL("./CoppaFantaPrototype.tsx", import.meta.url), "utf8");
  assert.match(source, /setTab\("results"\)[\s\S]*setTab\("table"\)/); assert.match(source, /hidden lg:block/);
  assert.match(source, /Array\.from\(\{ length: 14 \}/); assert.match(source, /aria-haspopup="listbox"[\s\S]*Giornata \{day\}/);
  assert.match(source, /aria-label="Da giornata Coppa"/); assert.match(source, /aria-label="A giornata Coppa"/); assert.match(source, /Giornate \{from\}–\{to\}/);
  assert.match(source, /qualificationSeparators\.has\(row\.position\)/); assert.match(source, /showQualification && row\.position >= 65 \? "border-l-2 border-l-rose-300 bg-rose-100\/60"/);
  assert.match(source, /sort === "official" \|\| sort === "points"/);
  assert.match(source, /showQualification && row\.position >= 65/);
  assert.match(source, /showQualification && qualificationSeparators\.has\(row\.position\)/);
  assert.match(source, /mt-1 block sm:ml-\[\.22em\] sm:mt-0 sm:inline/);
  assert.match(source, /sortCoppaStandings/); assert.match(source, /POS conserva la posizione ufficiale/);
  assert.doesNotMatch(source, /qualificationFor\(row\.position\)/); assert.match(source, /styles\.marqueeActive/);
  assert.match(source, /text-xl font-black[\s\S]*match\.homeGoals[\s\S]*text-\[10px\][\s\S]*match\.homeScore\.toFixed\(1\)/);
  assert.match(source, /min === max \? "text-slate-600"[\s\S]*value === max \? "text-emerald-600"[\s\S]*value === min \? "text-rose-700"/);
  for (const label of ["PT TOT", "V", "P", "S", "GF", "GS"]) assert.match(source, new RegExp(`"${label}"`));
});
