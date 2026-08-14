import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCoppaPrototype, coppaStandingsForRange, qualificationFor, qualificationSeparators, sortCoppaStandings, type CoppaMatch, type CoppaTeam } from "./coppa-fanta-fixture.ts";

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

test("classifica reale assegna 3/1/0, somma PT TOT e ignora le partite future", () => {
  const [a, b, c] = teams.slice(0, 3);
  const matches: CoppaMatch[] = [
    { id: "1", day: 1, home: a, away: b, homeGoals: 2, awayGoals: 1, homeScore: 66.5, awayScore: 67, status: "calcolata" },
    { id: "2", day: 2, home: a, away: c, homeGoals: 0, awayGoals: 0, homeScore: 72, awayScore: 68.5, status: "calcolata" },
    { id: "3", day: 3, home: b, away: c, homeGoals: null, awayGoals: null, homeScore: null, awayScore: null, status: "programmata" },
  ];
  const rows = coppaStandingsForRange([a, b, c], matches, 1, 3);
  const rowA = rows.find((row) => row.id === a.id)!;
  const rowB = rows.find((row) => row.id === b.id)!;
  assert.deepEqual({ points: rowA.points, total: rowA.totalPoints, won: rowA.won, drawn: rowA.drawn, lost: rowA.lost, gf: rowA.goalsFor, gs: rowA.goalsAgainst }, { points: 4, total: 138.5, won: 1, drawn: 1, lost: 0, gf: 2, gs: 1 });
  assert.deepEqual({ points: rowB.points, total: rowB.totalPoints, won: rowB.won, drawn: rowB.drawn, lost: rowB.lost, gf: rowB.goalsFor, gs: rowB.goalsAgainst }, { points: 0, total: 67, won: 0, drawn: 0, lost: 1, gf: 1, gs: 2 });
});

test("tie-break ufficiale usa PT, PT TOT, GF e infine nome", () => {
  const contenders = ["Delta", "Beta", "Alfa", "Aardvark"].map((name, index) => ({ ...teams[index], name }));
  const opponents = teams.slice(4, 8);
  const scores = [[4, 130], [3, 131], [5, 130], [4, 130]];
  const matches: CoppaMatch[] = contenders.map((home, index) => ({ id: String(index), day: 1, home, away: opponents[index], homeGoals: scores[index][0], awayGoals: 0, homeScore: scores[index][1], awayScore: 60, status: "calcolata" }));
  const rows = coppaStandingsForRange([...contenders, ...opponents], matches, 1, 1);
  assert.deepEqual(rows.slice(0, 4).map((row) => row.name), ["Beta", "Alfa", "Aardvark", "Delta"]);
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

test("fake e real mode restano separati senza fallback o write", async () => {
  const [server, loader, client] = await Promise.all([
    readFile(new URL("./MobileCoppeHub.tsx", import.meta.url), "utf8"),
    readFile(new URL("./data.ts", import.meta.url), "utf8"),
    readFile(new URL("./CoppaFantaPrototype.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(server, /if \(isGlobalFakeDataEnabled\(\)\)[\s\S]*demo[\s\S]*loadActiveCoppaData\(\)/);
  assert.match(server, /loadError=\{loadError\}/);
  assert.match(loader, /from\("stagioni"\)[\s\S]*eq\("attiva", true\)/);
  assert.match(loader, /competizioni\.codice", "coppa-fanta-20"/);
  assert.match(loader, /from\("partite"\)/);
  assert.doesNotMatch(loader + server, /\.(?:insert|update|upsert|delete)\(/);
  assert.match(client, /CALENDAR_UNAVAILABLE_MESSAGE/);
  assert.equal((await readFile(new URL("../../lib/competition-calendar.ts", import.meta.url), "utf8")).trim(), 'export const CALENDAR_UNAVAILABLE_MESSAGE = "Calendario ancora non disponibile per questa competizione";');
  assert.match(client, /ScheduledMatchStatus/);
  assert.doesNotMatch(client, />vs</i);
});

test("Campionati e Coppa condividono lo stesso stato futuro su due righe", async () => {
  const [cup, championships, shared] = await Promise.all([
    readFile(new URL("./CoppaFantaPrototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../campionati-live-preview/live-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ScheduledMatchStatus.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(cup, /<ScheduledMatchStatus \/>/);
  assert.match(championships, /<ScheduledMatchStatus \/>/);
  assert.match(shared, /<span className="block">Da<\/span><span className="block">giocare<\/span>/);
  assert.match(shared, /text-\[11px\][^"\n]*font-black[^"\n]*uppercase[^"\n]*leading-\[\.95\][^"\n]*tracking-\[\.12em\][^"\n]*text-sky-700/);
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
  assert.match(source, /text-xl font-black[\s\S]*match\.homeGoals[\s\S]*text-\[10px\][\s\S]*formatFantasyScore\(match\.homeScore\)/);
  assert.match(source, /min === max \? "text-slate-600"[\s\S]*value === max \? "text-emerald-600"[\s\S]*value === min \? "text-rose-700"/);
  for (const label of ["PT TOT", "V", "P", "S", "GF", "GS"]) assert.match(source, new RegExp(`"${label}"`));
});
