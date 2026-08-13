import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateGlobalMatchdayStats, calculateLeagueMatchdayStats, calculatePositionChanges, calculateSeasonStats, calculateStandings, deriveAvailableMatchdays, getLeagueRules, groupByOfficialRelegation, isOfficiallyRelegated, sortStandings, standingsAt, standingsForRange } from "./logic.ts";
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
  assert.ok(source.includes("href={`/societa/${team.slug}`}"));
  assert.ok(source.includes("href={`/societa/${row.slug}`}"));
});

test("record stagionali escludono le future e applicano il tie-break", () => {
  const games = [match(1, 1, a, b, 2, 2, 70, 60), match(2, 3, b, c, 3, 1, 80, 55), match(3, 4, a, c, null, null, 99, 10, "programmata")];
  const stats = calculateSeasonStats(games);
  assert.equal(stats.best?.score, 80); assert.equal(stats.worst?.score, 55); assert.equal(stats.highestScoringMatch?.id, "2");
});

test("slider intervallo 1-3 e 5-7 limita le partite", () => {
  const games = [match(1,1,a,b,1,0,70,60),match(2,3,a,b,1,0,70,60),match(3,5,a,b,0,1,60,70),match(4,7,a,b,0,1,60,70)];
  assert.equal(standingsForRange([a,b],games,1,3)[0].id,a.id);
  assert.equal(standingsForRange([a,b],games,5,7)[0].id,b.id);
});

test("ordinamento PT/Pttot preserva posizione ufficiale e confine retrocessione", () => {
  const teams=Array.from({length:20},(_,index)=>team(index+1,`Team ${String(index+1).padStart(2,"0")}`));
  const rows=calculateStandings(teams,[]).map((row,index)=>({...row,points:index,fantasyPoints:100-index}));
  for(const key of ["points","fantasyPoints"] as const){
    const groupedA=groupByOfficialRelegation(sortStandings(rows,key,"asc"),"serie-a"),groupedB=groupByOfficialRelegation(sortStandings(rows,key,"desc"),"serie-b");
    assert.equal(groupedA.slice(-3).every(row=>isOfficiallyRelegated("serie-a",row.position,20)),true);
    assert.equal(groupedB.slice(-4).every(row=>isOfficiallyRelegated("serie-b",row.position,20)),true);
  }
  assert.equal(rows.filter(row=>isOfficiallyRelegated("serie-c-a",row.position,20)).length,0);
});

test("UI condivisa, selettore compatto, Da giocare e popup semplificato", async () => {
  const source = await readFile(new URL("./live-client.tsx", import.meta.url), "utf8");
  const mockClient = await readFile(new URL("../campionati-preview/preview-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Seleziona giornata")); assert.ok(source.includes("Da giocare"));
  assert.equal(source.includes('["played","G"]'),false); assert.equal(source.includes('["goalDifference","DR"]'),false);
  assert.ok(mockClient.includes("<ChampionshipView data={normalized} mock />"));
});

test("rifiniture PR1.1: pallino, slider doppio, stagione e marquee", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8"),css=await readFile(new URL("./championship.module.css",import.meta.url),"utf8");
  assert.ok(source.includes('value===currentDay?"bg-emerald-500')); assert.equal(source.includes("<option"),false);
  assert.equal((source.match(/type="range"/g)?.length??0)>=2,true); assert.ok(source.includes("Math.min(Number(event.target.value),to)")); assert.ok(source.includes("Math.max(Number(event.target.value),from)"));
  assert.equal(source.includes("<select value={data.season.code}"),false); assert.ok(source.includes("liveColors={!mock}")); assert.ok(source.includes('className="lg:hidden">{selector}'));
  assert.ok(css.includes("scrollWidth-viewport.current.clientWidth")===false); assert.ok(source.includes("text.current.scrollWidth-viewport.current.clientWidth")); assert.ok(css.includes("prefers-reduced-motion")); assert.ok(/overflow:\s*hidden/.test(css));
  assert.ok(source.includes('min-h-[60px]'));
});

test("PR1.2 usa card uniche, testi richiesti e palette per tutte le leghe", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8");
  for(const text of ["MVP di giornata","DISASTRO di giornata","MVP DI LEGA","DISASTRO DI LEGA","Record stagionale:"]) assert.ok(source.includes(text));
  assert.ok(source.includes("from-sky-400 to-blue-600")); assert.ok(source.includes("from-emerald-500 to-teal-700")); assert.ok(source.includes("from-violet-500 to-indigo-700"));
  assert.ok(source.includes('<p className="section-eyebrow">{league.name}</p>')); assert.equal(source.includes(">Calendario<"),false);
});

test("PR1.2 uniforma PT., PT.tot, popup e corona", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('label="PT."')); assert.ok(source.includes('label="PT.tot"')); assert.ok(source.includes('["points","PT."]')); assert.ok(source.includes('["fantasyPoints","PT.tot"]'));
  assert.ok(source.includes("grid-cols-[38px_32px_minmax(0,1fr)_38px_38px_60px]")); assert.ok(source.includes("whitespace-nowrap text-center font-black tabular-nums"));
  assert.equal(/crown|corona_logo|Prima classificata/i.test(source),false); assert.ok(source.includes("border-l-[3px]")); assert.ok(source.includes("shadow-[inset_0_2px_3px_-2px_rgba(225,29,72,.55)]"));
  assert.ok(source.includes("lg:grid-cols-[minmax(0,1fr)]")); assert.ok(source.includes('lg:justify-self-end">{selector}'));
});

test("corona rimossa da tutte le implementazioni senza spazio riservato", async () => {
  const live=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8"),legacy=await readFile(new URL("../campionati-preview/preview-components.tsx",import.meta.url),"utf8");
  assert.equal(/crown|corona_logo|Prima classificata/i.test(live+legacy),false);
  assert.equal(legacy.includes("grid-cols-[16px_22px"),false);
});

test("correzioni finali: menu centrato, record partita compatto e testate allineate", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('scrollIntoView({block:"center"})')); assert.ok(source.includes("selectedOption"));
  assert.ok(source.includes("season.home.logo")); assert.ok(source.includes("season.away.logo")); assert.equal(source.includes("<TeamLink team={season.home}"),false);
  assert.ok(source.includes("min-h-[148px]")); assert.ok(source.includes("sm:min-h-[170px]"));
  assert.ok(source.includes('className="order-1 self-center lg:self-start lg:col-start-1 lg:row-start-2"')); assert.ok(source.includes('className="order-2 lg:col-start-1 lg:row-start-1 lg:justify-self-end"'));
  assert.ok(source.includes("text-center tabular-nums text-blue-950")); assert.ok(source.includes("whitespace-nowrap text-center font-black tabular-nums"));
});

test("correzioni testi, gerarchia dati e allineamento definitivo", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8");
  assert.ok(source.includes("GOLEADA DI GIORNATA")); assert.equal(source.includes("Partita con più gol della giornata"),false);
  assert.ok(source.includes("text-3xl font-black leading-none")); assert.ok(source.includes("fantapunti</small>"));
  assert.ok(source.includes("G.{season.matchday}")); assert.ok(source.includes("season.homeGoals}–{season.awayGoals")); assert.equal(source.includes("<TeamLink team={season.home}"),false);
  assert.ok(source.includes("lg:absolute lg:-top-8")); assert.ok(source.includes("lg:grid-rows-[44px_52px]"));
  assert.equal(source.includes("Stagione ${data.season.name}"),false); assert.ok(source.includes("mock&&<div"));
  assert.ok(source.includes("items-center justify-between gap-2 lg:grid"));
});

test("PR2 collega animazioni, hover e feedback ai componenti realmente renderizzati", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8"),css=await readFile(new URL("./championship.module.css",import.meta.url),"utf8");
  for(const token of ["styles.movementUp","styles.movementDown","styles.contentEnter","styles.recordCard","styles.resultRow","styles.standingRow","styles.currentDot","styles.menuEnter","styles.press","styles.numberFade"]) assert.ok(source.includes(token),token);
  for(const token of ["smart-marquee","movement-up","movement-down","recordCard:hover","resultRow:hover","standingRow:hover","current-dot","press:active"]) assert.ok(css.includes(token),token);
  assert.equal(css.includes("@media (max-width: 1023px)"),false);
});

test("PR2 slider e popup sono collegati a tooltip, focus trap e focus return", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8");
  assert.ok(source.includes("styles.rangeTooltip")); assert.ok(source.includes('onPointerDown={()=>setActiveHandle("from")}')); assert.ok(source.includes('onFocus={()=>setActiveHandle("to")}'));
  assert.ok(source.includes("querySelectorAll<HTMLElement>")); assert.ok(source.includes('event.key!=="Tab"')); assert.ok(source.includes('event.key==="Escape"'));
  assert.ok(source.includes("styles.overlayEnter")); assert.ok(source.includes("styles.panelExit")); assert.ok(source.includes("modalOpener.current?.focus()"));
});

test("PR2 rispetta reduced motion e mantiene la corona rimossa", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8"),css=await readFile(new URL("./championship.module.css",import.meta.url),"utf8");
  assert.ok(css.includes("prefers-reduced-motion:reduce")); assert.ok(css.includes(".marqueeActive,.movementUp,.movementDown"));
  assert.equal(/crown|corona_logo|Prima classificata/i.test(source),false);
});

test("correzioni finali: testata desktop stabile, cambio giornata senza flash e slider sincrono", async () => {
  const source=await readFile(new URL("./live-client.tsx",import.meta.url),"utf8"),css=await readFile(new URL("./championship.module.css",import.meta.url),"utf8");
  assert.ok(source.includes("lg:w-full lg:min-h-[96px] lg:grid-cols-[minmax(0,1fr)]"));
  assert.ok(source.includes('lg:col-start-1 lg:row-start-1 lg:justify-self-end">{selector}'));
  assert.ok(source.includes('zIndex:activeHandle==="from"?4')); assert.ok(source.includes('zIndex:activeHandle==="to"?4'));
  assert.ok(css.includes(".contentEnter { animation:none; }")); assert.ok(css.includes(".numberFade { animation:none; }"));
  assert.equal(css.includes("@keyframes content-enter"),false); assert.equal(css.includes("@keyframes number-fade"),false);
  assert.ok(css.includes(".rangeFill") && css.includes("transition:none")); assert.equal(css.includes("scale(1.12)"),false);
  assert.ok(css.includes("box-shadow:none; pointer-events:auto; cursor:grab; transition:none"));
  assert.ok(css.includes(".rangeInput:focus-visible::-webkit-slider-thumb")); assert.ok(css.includes(".rangeInput:focus-visible::-moz-range-thumb"));
});

test("highlight globali hanno tre palette premium coerenti e record integrato", async () => {
  const source = await readFile(new URL("./live-client.tsx", import.meta.url), "utf8");
  assert.match(source, /#5b3505_0%[\s\S]*#b7790b_48%[\s\S]*#6e4208_100%/);
  assert.match(source, /#071f45_0%[\s\S]*#123b6a_58%[\s\S]*#081a38_100%/);
  assert.match(source, /#170b16_0%[\s\S]*#4b142b_58%[\s\S]*#210b18_100%/);
  assert.match(source, /text-\[11px\] font-black uppercase[\s\S]*MVP di giornata/);
  assert.doesNotMatch(source, /font-onder-title[\s\S]{0,200}(?:MVP|GOLEADA|DISASTRO)/);
  assert.match(source, /rounded-xl border-t[\s\S]*Record stagionale/);
});
