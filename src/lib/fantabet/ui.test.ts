import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canConfirmSlip, canConfirmSubmittedSlip, clampExactScore, compactLeaderboard, confirmRoundBetId, consistencyBlockProgress, countdownParts, currentStreakPresentation, currentTeamPosition, filterLeaderboard, isCompletePrediction, isDemoMode, isSubmitButtonDisabled, predictionOptions, recentTeamStats, searchLeaderboard, selectRelevantRound } from "./ui.ts";
import { createFantaBetDemoData } from "./demo.ts";

test("seleziona round aperta, altrimenti ultima conclusa, senza hardcodare id", () => {
  const rounds = [{ id: 2, status: "chiusa", opens_at: "2026-01-01", deadline_at: "2026-01-02" }, { id: 9, status: "pubblicata", opens_at: "2026-08-01", deadline_at: "2026-08-10" }];
  assert.equal(selectRelevantRound(rounds, new Date("2026-08-08")).id, 9);
  assert.equal(selectRelevantRound([], new Date()), null);
});

test("stato schedina da 0/5 a 5/5 e risultato esatto", () => {
  assert.equal(isCompletePrediction("1X2", null), false);
  assert.equal(isCompletePrediction("RISULTATO_ESATTO", { scelta: "ESATTO", exact_home: 2, exact_away: 1 }), true);
  assert.equal(isCompletePrediction("RISULTATO_ESATTO", { scelta: "ESATTO", exact_home: 2, exact_away: null }), false);
});

test("render options 1X2, Under Over e Fantapunteggio", () => {
  assert.deepEqual(predictionOptions("1X2").map((item) => item.label), ["1", "X", "2"]);
  assert.deepEqual(predictionOptions("UNDER_OVER_2_5").map((item) => item.label), ["UNDER 2.5", "OVER 2.5"]);
  assert.deepEqual(predictionOptions("FANTAPUNTEGGIO_1X2").map((item) => item.label), ["1", "X", "2"]);
});

test("leaderboard top 15, ricerca case insensitive e utente fuori top", () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({ username: index === 18 ? "Federico_20" : `User${index}`, posizione: index + 1 }));
  assert.equal(compactLeaderboard(rows).length, 15);
  assert.equal(searchLeaderboard(rows, "FEDERICO")[0].posizione, 19);
  assert.equal(compactLeaderboard(rows).some((row) => row.posizione === 19), false);
});

test("ultime 5 non mescolano dati passati dal chiamante e gestiscono mancanti", () => {
  const matches = Array.from({ length: 6 }, (_, index) => ({ matchday: index + 1, homeId: 1, awayId: 2, homeGoals: 2, awayGoals: index % 2, homeFantasy: index === 5 ? null : 70, awayFantasy: 65 }));
  const stats = recentTeamStats(matches, 1);
  assert.equal(stats.played, 5); assert.equal(stats.wins, 5); assert.equal(stats.goalsFor, 10); assert.equal(stats.averageFantasy, 70); assert.equal(stats.fantasyPointsTotal, 280);
  assert.equal(stats.details[0].home, true); assert.equal(stats.details[0].fantasyPoints, null);
  assert.equal(recentTeamStats([], 1).averageFantasy, null);
  assert.equal(currentTeamPosition(matches, 1), 1);
});

test("anon vede FantaBet ma la CTA richiede account", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /Accedi per giocare/);
  assert.match(client, /href="\/account\/accedi"/);
  assert.match(client, /Nuova schedina in arrivo/);
});

test("salvataggio usa auth uid, persiste su predictions e non usa service role", async () => {
  const action = await readFile(new URL("../../app/fantabet/actions.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(action, /profile_id: user\.id/);
  assert.match(action, /upsert\(payload, \{ onConflict: "profile_id,bet_id" \}\)/);
  assert.match(server, /from\("fantabet_predictions"\)\.select\("id,bet_id,scelta,exact_home,exact_away"\)/);
  assert.doesNotMatch(action + server, /SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

test("UI contiene leaderboard completa, badge e statistiche isolate per edizione", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(client, /OfficialAccountBadge/); assert.match(client, /Cerca username/); assert.match(client, /La tua posizione/);
  assert.match(server, /item\.edizione_competizione_id === match\.edizione_competizione_id/);
  assert.match(server, /item\.giornata_lega < match\.giornata_lega/);
});

test("demo è impossibile in production e popola 20 utenti senza database", () => {
  assert.equal(isDemoMode("production", "1"), false);
  assert.equal(isDemoMode("development", "1"), true);
  assert.equal(isDemoMode("test", "1"), true);
  const demo = createFantaBetDemoData({ serverNow: new Date().toISOString(), viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] });
  assert.equal(demo.leaderboard.length, 20);
  assert.equal(demo.bets.length, 5);
  assert.equal(demo.leaderboard.some((row) => row.societa_id !== null), true);
  assert.equal(demo.leaderboard.slice(0, 15).some((row) => row.profile_id === demo.viewerId), false);
});

test("risultato esatto parte da zero e gli stepper non diventano negativi", () => {
  assert.equal(clampExactScore(-1), 0);
  assert.equal(clampExactScore(2.8), 2);
  assert.equal(clampExactScore(Number.NaN), 0);
  assert.equal(clampExactScore(20), 20);
  assert.equal(clampExactScore(21), 20);
});

test("conferma è abilitata soltanto a 5/5 nella finestra aperta", () => {
  assert.equal(canConfirmSlip(4, 5, true), false);
  assert.equal(canConfirmSlip(5, 5, true), true);
  assert.equal(canConfirmSlip(5, 5, false), false);
  assert.equal(canConfirmSubmittedSlip(5, 4, 5, true), false);
  assert.equal(canConfirmSubmittedSlip(5, 5, 5, true), true);
});

test("le conferme delle giocate sono idempotenti, limitate e isolate alla round", () => {
  const roundBetIds = new Set([11, 12, 13, 14, 15]);
  assert.deepEqual([...confirmRoundBetId(new Set([11]), 11, roundBetIds, 5)], [11]);
  assert.deepEqual([...confirmRoundBetId(new Set([11]), 99, roundBetIds, 5)], [11]);
  assert.deepEqual([...confirmRoundBetId(new Set([11, 12, 13, 14, 15]), 12, roundBetIds, 5)], [11, 12, 13, 14, 15]);
  assert.deepEqual([...confirmRoundBetId(new Set([11]), 12, roundBetIds, 5)], [11, 12]);
});

test("SSR e primo render client hanno Conferma schedina disabilitata e sempre booleana", () => {
  const input = { hydrated: false, completed: 5, confirmed: 5, required: 5, writable: true, pending: false };
  const serverDisabled = isSubmitButtonDisabled(input);
  const firstClientDisabled = isSubmitButtonDisabled(input);
  assert.equal(serverDisabled, true);
  assert.equal(firstClientDisabled, serverDisabled);
  assert.equal(typeof serverDisabled, "boolean");
  assert.equal(typeof isSubmitButtonDisabled({ ...input, hydrated: true }), "boolean");
  assert.equal(isSubmitButtonDisabled({ ...input, hydrated: true }), false);
});

test("countdown usa uno snapshot esplicito ed è identico fra server e hydration", () => {
  const deadline = "2026-08-10T12:00:00.000Z";
  const snapshot = new Date("2026-08-08T10:30:15.000Z").getTime();
  assert.deepEqual(countdownParts(deadline, snapshot), countdownParts(deadline, snapshot));
  assert.deepEqual(countdownParts(deadline, snapshot), [["GIORNI", 2], ["ORE", 1], ["MINUTI", 29], ["SECONDI", 45]]);
});

test("nessun branch iniziale FantaBet legge window o Date.now durante il render", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const beforeEffect = client.slice(0, client.indexOf("useEffect(() =>"));
  assert.doesNotMatch(beforeEffect, /\bwindow\b|Date\.now\(\)/);
  assert.match(client, /useSyncExternalStore\(emptySubscribe, \(\) => true, \(\) => false\)/);
  assert.doesNotMatch(client, /suppressHydrationWarning/);
});

test("deadline e stato submission mantengono blocco coerente", () => {
  const ready = { hydrated: true, completed: 5, confirmed: 5, required: 5, pending: false };
  assert.equal(isSubmitButtonDisabled({ ...ready, writable: false }), true);
  assert.equal(isSubmitButtonDisabled({ ...ready, writable: true }), false);
  assert.equal(isSubmitButtonDisabled({ ...ready, writable: true, pending: true }), true);
});

test("UI distingue pronta, confermata, da riconfermare e scaduta senza submission", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /Schedina pronta da confermare/);
  assert.match(client, /SCHEDINA COMPILATA/);
  assert.match(client, /Da confermare/);
  assert.match(client, /Schedina non confermata/);
  assert.match(client, /deadlinePassed \? "Schedina non confermata"/);
});

test("UI visuale include card 1X2, forma V/S/P, collapse e FantaPT distinto", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /VisualChoices/);
  assert.match(client, /value === "V"/); assert.match(client, /value === "S"/); assert.match(client, /value === "P"/);
  assert.match(client, /CONFERMA GIOCATA/); assert.match(client, /FANTAPUNTEGGIO PIÙ ALTO/); assert.match(client, /border-sky-600 bg-sky-600/);
  assert.match(client, /overflow-x-hidden/); assert.match(client, /min-w-0/);
});

test("selezione salva senza collapse, Conferma giocata chiude e una modifica richiede riconferma", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const savedBlock = client.slice(client.indexOf("function saved"), client.indexOf("function confirm()"));
  assert.match(savedBlock, /setPredictions/);
  assert.match(savedBlock, /setConfirmedBets/);
  assert.doesNotMatch(savedBlock, /next\.delete\(prediction\.bet_id\).*setExpanded/s);
  assert.match(client, /function confirmPlay[\s\S]*setConfirmedBets/);
  assert.match(client, /next\.delete\(betId\)/);
  assert.match(client, /onToggle/);
});

test("1X2 e FantaPT non renderizzano il blocco squadra duplicato", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /bet\.type === "UNDER_OVER_2_5" \|\| bet\.type === "RISULTATO_ESATTO"/);
  assert.match(client, /VisualChoices/);
  assert.match(client, /items-stretch/);
});

test("demo forza statistiche coerenti su tutte le cinque giocate", () => {
  const demo = createFantaBetDemoData({ serverNow: new Date().toISOString(), viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] });
  assert.equal(demo.bets.every((bet) => bet.homeStats.played === 5 && bet.awayStats.played === 5), true);
  assert.equal(demo.bets.every((bet) => bet.homeStats.form.length === 5 && bet.awayStats.form.length === 5), true);
  assert.equal(demo.bets.every((bet) => bet.homeStats.points !== null && bet.awayStats.points !== null), true);
});

test("submission è server-side, unica, riapribile prima deadline e invalidata dalle modifiche", async () => {
  const action = await readFile(new URL("../../app/fantabet/actions.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../../../supabase/migrations/202608080001_fantabet_round_submissions.sql", import.meta.url), "utf8");
  assert.match(action, /confirm_my_fantabet_round/); assert.match(action, /reopen_my_fantabet_round/);
  assert.match(migration, /primary key \(profile_id, round_id\)/i);
  assert.match(migration, /actual_count <> expected_count/);
  assert.match(migration, /submitted >= deadline/);
  assert.match(migration, /delete from public\.fantabet_round_submissions/);
  assert.match(migration, /after insert or update on public\.fantabet_predictions/);
  assert.match(action, /PGRST202/);
  assert.match(action, /202608080001|FantaBet submissions|fantabet\/submission/);
  assert.match(action, /Conferma non disponibile: manca la migrazione FantaBet submissions/);
});

test("demo include 20 utenti, premi derivabili e tutte le 38 giornate", () => {
  const empty = { serverNow: new Date().toISOString(), viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] };
  const current = createFantaBetDemoData(empty);
  const past = createFantaBetDemoData(empty, 8035);
  const pastRounds = [34, 35, 36, 37].map((number) => createFantaBetDemoData(empty, 8000 + number));
  assert.equal(current.leaderboard.length, 20); assert.equal(current.roundLeaderboard.length, 20);
  assert.deepEqual({ predictions: current.roundLeaderboard[0].punti_pronostici, bonus: current.roundLeaderboard[0].punti_bonus_costanza, total: current.roundLeaderboard[0].punti_totali }, { predictions: 38, bonus: 10, total: 48 });
  assert.equal(current.availableRounds.length, 38); assert.deepEqual(current.availableRounds.map((round) => round.number), Array.from({ length: 38 }, (_, index) => index + 1));
  assert.equal(past.round?.number, 35); assert.equal(past.predictions.length, 5);
  assert.equal(past.bets.every((bet) => bet.result.status === "calcolata"), true);
  assert.deepEqual(pastRounds.map((round) => round.round?.number), [34, 35, 36, 37]);
  assert.equal(pastRounds.some((round) => round.bets.some((bet) => bet.result.status === "rinviata")), true);
  assert.deepEqual(pastRounds.map((round) => round.predictions.length), [5, 5, 5, 0]);
  assert.equal(pastRounds[3].submission, null);
});

test("Conferma giocata scorre alla prossima card rispettando reduced motion", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /scrollIntoView/); assert.match(client, /prefers-reduced-motion: reduce/);
  assert.match(client, /behavior:.*\? "auto" : "smooth"/); assert.match(client, /block: "center"/);
});

test("risultato esatto usa una sola conferma e le righe mostrano la scelta", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /SALVA RISULTATO/); assert.match(client, /predictionLabel/);
  assert.match(client, /"U2\.5"/); assert.match(client, /"O2\.5"/);
  assert.match(client, /exact_home \?\? 0/); assert.match(client, /exact_away \?\? 0/); assert.match(client, /FANTA PT/);
});

test("stato finale usa due barre e countdown mobile occupa la larghezza", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /SCHEDINA COMPILATA/); assert.match(client, /MODIFICA SCHEDINA/); assert.match(client, /space-y-2/);
  assert.match(client, /w-full text-center sm:w-auto/); assert.match(client, /grid w-full grid-cols-4/); assert.match(client, /overflow-x-hidden/);
});

test("round passate sono read-only con esito corretto, errato e pending", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /readOnlyRound \? <PastBetCard/); assert.match(client, /bg-emerald-50/); assert.match(client, /bg-rose-50/);
  assert.doesNotMatch(client, />GIOCATA</); assert.match(client, /homeFantasyPoints/); assert.match(client, /Pronostici non effettuati per questa giornata/);
  assert.match(client, /score\?\.correct/); assert.match(client, /score\?\.evaluable/);
  assert.match(client, /Valutazione della giornata in corso/);
});

test("navigazione usa round reali; classifica di giornata resta backend ma non è un toggle UI", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../../../supabase/migrations/202608080002_fantabet_round_leaderboard.sql", import.meta.url), "utf8");
  assert.match(client, /RoundNavigation/); assert.match(client, /previousRound/); assert.match(client, /nextRound/);
  assert.match(client, /GLOBALE/); assert.doesNotMatch(client, />GIORNATA<|setMode\("round"\)/); assert.match(client, /RoundTipsters/);
  assert.match(server, /fantabet_round_leaderboard/); assert.match(server, /requestedRoundId/);
  assert.match(migration, /create or replace function public\.fantabet_round_leaderboard/); assert.match(migration, /fantabet_round_submissions/);
  assert.match(migration, /punti_pronostici \+ totals\.punti_bonus_costanza/); assert.doesNotMatch(migration, /auth\.users|\bemail\b/i);
  assert.match(migration, /target\.deadline_at <= statement_timestamp\(\)/);
  assert.match(migration, /evaluation\.fully_evaluable/);
});

test("filtri leaderboard separano Globale, Community e Verificati", () => {
  const rows = [{ societa_id: null, username: "Community" }, { societa_id: 7, username: "Official" }];
  assert.equal(filterLeaderboard(rows, "global").length, 2);
  assert.deepEqual(filterLeaderboard(rows, "community").map((row) => row.username), ["Community"]);
  assert.deepEqual(filterLeaderboard(rows, "official").map((row) => row.username), ["Official"]);
});

test("statistiche comparative, sintesi dedicate, rosa e mobile sono presenti", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /CombinedStatsPanel/); assert.match(client, /SQUADRA CASA/); assert.match(client, /SQUADRA OSPITE/);
  assert.match(client, /FPT\.TOT/); assert.match(client, /title="Gol fatti"/); assert.match(client, /title="Gol subiti"/); assert.match(client, /MEDIA FPT/);
  assert.doesNotMatch(client, /PuntiTOT/);
  assert.match(client, /Ultime 5/); assert.match(client, /fantasyPoints/); assert.match(client, /ROSA 2026\/27/); assert.match(client, /#rosa/);
  assert.match(client, /RecentResults/); assert.match(client, /FantasyValues/); assert.match(client, /text-emerald-700/); assert.match(client, /text-rose-700/); assert.match(client, /text-slate-500/);
  assert.match(client, /h-4 min-w-4/); assert.match(client, /gap-0\.5 sm:gap-1/); assert.match(client, /overflow-hidden rounded-xl/);
  assert.match(client, /grid-cols-\[minmax\(0,1fr\)_1px_minmax\(0,1fr\)\]/); assert.match(client, /via-slate-300/);
});

test("leaderboard ha profili cliccabili, G, filtri, qualificazione, podio e scrollbar separata", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const profile = await readFile(new URL("../../app/user/[username]/page.tsx", import.meta.url), "utf8");
  assert.match(client, /\/user\/\$\{encodeURIComponent\(row\.username\)\}/); assert.match(profile, /\.eq\("username", username\)/);
  assert.match(client, /Giornate giocate/); assert.match(client, /COMMUNITY/); assert.match(client, /VERIFICATI/);
  assert.match(client, /Zona qualificazione · Top 10/); assert.match(client, /border-amber-300 bg-amber-50/); assert.match(client, /border-slate-300/); assert.match(client, /border-orange-300/);
  assert.match(client, /overflow-y-auto pr-3/);
});

test("Tipster Top 3 storico e Tipster Memorabili compaiono nelle aree corrette", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /Tipster di giornata/); assert.match(client, /rows\.slice\(0, 3\)/);
  assert.match(client, /I Tipster Memorabili/); assert.match(client, /LA SBANCATA/); assert.doesNotMatch(client, /IL CECCHINO/); assert.match(client, /L’IMPECCABILE/);
  assert.match(client, /showRecords=\{true\}/); assert.match(client, /if \(!demo/);
});

test("selettore compatto distingue corrente, storico e deadline", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(client, /role="listbox"/); assert.match(client, /Giornate disponibili/); assert.match(client, /Giornata attuale/);
  assert.match(client, /bg-emerald-500/); assert.match(client, /shadow-\[0_0_7px/); assert.match(client, /rounds\.map/);
  assert.match(client, /disabled=\{true\}/); assert.match(client, /section-eyebrow/);
  assert.match(client, /isCurrentRound && serverWindowOpen && <Countdown/); assert.match(client, /currentId=\{currentRound\?\.id/);
  assert.match(server, /\["pubblicata", "chiusa", "valutata"\]\.includes\(round\.status\)/);
  assert.doesNotMatch(server, /selectableRounds[\s\S]{0,180}opens_at\)\.getTime\(\) <= serverNow/);
});

test("round pre-open è visibile, read-only e non tenta salvataggi", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../../app/fantabet/actions.ts", import.meta.url), "utf8");
  assert.match(client, /const preOpen = round\.status === "pubblicata".*now < new Date\(round\.opensAt\)/);
  assert.match(client, /Schedina non ancora aperta/); assert.match(client, /Le giocate apriranno il/);
  assert.match(client, /writable=\{writable\}/); assert.match(client, /if \(!viewerId \|\| !writable \|\| submitted\) return/);
  assert.match(actions, /now < new Date\(roundResult\.data\.opens_at\).*La schedina non è ancora aperta/s);
});

test("navigazione pubblica usa tutte le round reali e il parametro id", async () => {
  const page = await readFile(new URL("../../app/fantabet/page.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(page, /params\.round/); assert.match(server, /find\(\(round\) => round\.id === requestedRoundId\)/);
  assert.match(server, /sort\(\(a, b\) => a\.numero_giornata - b\.numero_giornata/);
  assert.doesNotMatch(server, /G38|numero_giornata.*38/);
});

test("storico mette punti e Tipster prima delle giocate", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /Punti effettuati/); assert.doesNotMatch(client, /Risultati azzeccati/); assert.match(client, /Moltiplicatore schedina perfetta/);
  assert.match(client, /border-emerald-300 bg-emerald-500\/30/); assert.match(client, /border-rose-300 bg-rose-500\/30/); assert.match(client, /★ Schedina perfetta/);
  assert.match(client, /<PastRoundSummary.*<RoundTipsters.*initial\.bets\.map/s);
});

test("cambio round rimonta lo snapshot e ripristina submission e cinque giocate", async () => {
  const page = await readFile(new URL("../../app/fantabet/page.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(page, /key=\{initial\.round\?\.id \?\? "fantabet-empty"\}/);
  assert.match(client, /initial\.submission \? new Set\(initial\.bets\.map/);
  assert.match(client, /initial\.submission \? new Set\(\) : new Set\(initial\.bets\.map/);
  assert.match(client, /GIOCATA EFFETTUATA/);
});

test("demo corrente resta confermata e si ricostruisce uguale dopo la navigazione storica", () => {
  const empty = { serverNow: new Date().toISOString(), viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] };
  const first = createFantaBetDemoData(empty);
  createFantaBetDemoData(empty, 8037);
  const returned = createFantaBetDemoData(empty, 8038);
  assert.equal(first.round?.number, 38); assert.equal(first.predictions.length, 5); assert.notEqual(first.submission, null);
  assert.deepEqual(returned.predictions, first.predictions); assert.deepEqual(returned.submission, first.submission);
});

test("spacing header riusa esattamente il pattern eyebrow del sito", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const pageHeader = await readFile(new URL("../../app/components/PageHeader.tsx", import.meta.url), "utf8");
  for (const token of ["mt-2.5", "sm:mt-4", "mt-3", "sm:mt-6", "leading-5", "sm:leading-8"]) { assert.match(client, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); assert.match(pageHeader, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); }
});

test("bonus visuale rappresenta 0/5, 3/5 e il quinto traguardo", () => {
  assert.equal(consistencyBlockProgress(0), 0); assert.equal(consistencyBlockProgress(3), 3); assert.equal(consistencyBlockProgress(5), 5); assert.equal(consistencyBlockProgress(6), 1);
});

test("banner separa perfetta, costanza e moltiplicatore senza crescere in fondo", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /justify-between[\s\S]*★ Schedina perfetta/); assert.match(client, /Bonus costanza/); assert.match(client, /index === 4 \? "\+10"/);
  assert.match(client, />×2</); assert.match(client, /Moltiplicatore schedina perfetta ottenuto/); assert.match(client, /Moltiplicatore schedina perfetta non ottenuto/);
  assert.doesNotMatch(client, /Risultati azzeccati/); assert.doesNotMatch(client, /mt-2 text-center text-xs font-black text-amber-300/);
  assert.match(client, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,2fr\)_minmax\(0,1fr\)\]/);
  assert.match(client, /grid min-h-14 place-items-center/); assert.match(client, /grid min-h-14 content-center/);
});

test("storico usa colonne stabili, una riga mobile e nomi completi accessibili", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function FantasyValues"));
  assert.match(compact, /grid-cols-\[44px_minmax\(0,1fr\)_64px\]/); assert.match(compact, /sm:grid-cols-\[52px_minmax\(0,1fr\)_72px\]/);
  assert.match(client, /truncate/); assert.match(client, /overflow-hidden/); assert.match(client, /title=\{`\$\{bet\.home\.name\} vs \$\{bet\.away\.name\}`\}/); assert.match(client, /aria-label=\{`\$\{shortType/);
});

test("submitted usa lo slot finale, accordion e controlli read-only", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /role="status"[\s\S]*GIOCATA EFFETTUATA ✓/); assert.match(client, /onClick=\{submitted \? onToggle : undefined\}/);
  assert.match(client, /aria-expanded=\{submitted \? true : undefined\}/); assert.match(client, /controlsDisabled: boolean = Boolean\(!writable \|\| pending \|\| submitted\)/);
  assert.doesNotMatch(client, /GIOCATA EFFETTUATA ✓ ·/);
});

test("demo G36 perfetta implica 5 su 5 e G37 non è giocata", () => {
  const empty = { serverNow: "2026-08-09T12:00:00.000Z", viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] };
  const g36 = createFantaBetDemoData(empty, 8036); const viewer36 = g36.roundLeaderboard.find((row) => row.profile_id === g36.viewerId);
  assert.equal(viewer36?.schedina_perfetta, true); assert.equal(viewer36?.pronostici_corretti, 5); assert.equal(g36.predictions.length, 5);
  const g37 = createFantaBetDemoData(empty, 8037);
  assert.equal(g37.predictions.length, 0); assert.equal(g37.submission, null); assert.equal(g37.roundLeaderboard.length, 0);
});

test("storico mostra solo dati essenziali e comunica esito tramite colore", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const historical = client.slice(client.indexOf("function PastBetCard"), client.indexOf("function ConsistencyProgress"));
  assert.match(historical, /homeFantasyPoints/); assert.match(historical, /realResult\(bet\)/); assert.doesNotMatch(historical, />GIOCATA</);
  assert.doesNotMatch(historical, /✓|✕|score\.points|\+\$\{/); assert.match(historical, /<CompactBetCard/);
});

test("selezioni usano focus premium senza bordo nero doppio", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /ring-blue-950|ring-offset-2/); assert.match(client, /focus-visible:ring-2 focus-visible:ring-sky-300/); assert.match(client, /hover:border-sky-400/); assert.match(client, /disabled:opacity-50/);
  assert.match(client, /Risultato esatto selezionato/); assert.match(client, /grid grid-cols-3 items-stretch/);
});

test("card hanno accenti per tipo, hover leggero e reduced motion", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  for (const color of ["border-l-sky-400", "border-l-amber-400", "border-l-indigo-400", "border-l-teal-400"]) assert.match(client, new RegExp(color));
  assert.match(client, /sm:hover:-translate-y-0\.5/); assert.match(client, /motion-reduce:transition-none/);
});

test("reopen scorre alla prima giocata soltanto nel ramo di successo", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const reopen = client.slice(client.indexOf("function reopen()"), client.indexOf("function confirmPlay"));
  assert.match(reopen, /if \(result\.ok\)[\s\S]*scrollToFirstBet\(\)/); assert.doesNotMatch(reopen, /if \(!result\.ok\)[\s\S]*scrollToFirstBet/);
  assert.match(client, /prefers-reduced-motion: reduce/);
});

test("data layer reale non limita le round disponibili a cinque", async () => {
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  const availableBlock = server.slice(server.indexOf("const selectableRounds"), server.indexOf("if (!selected)"));
  assert.doesNotMatch(availableBlock, /slice\(|limit\(5\)|\.limit\(5\)/); assert.match(availableBlock, /opens_at/); assert.match(availableBlock, /availableRounds/);
});

test("Giocata effettuata resta nello slot senza bordo", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const status = client.match(/<div role="status" className="([^"]+)">GIOCATA EFFETTUATA ✓<\/div>/);
  assert.ok(status); assert.match(status[1], /min-h-11 w-full/); assert.match(status[1], /rounded-xl/); assert.doesNotMatch(status[1], /\bborder\b/);
});

test("collassata separa tipo e PT dalla partita e mostra spunta solo se confermata", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const collapsed = client.slice(client.indexOf("if (complete && !expanded)"), client.indexOf("return <article"));
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function FantasyValues"));
  assert.match(collapsed, /<CompactBetCard/); assert.match(collapsed, /\{bet\.points\} PT/); assert.doesNotMatch(collapsed, />\+\{bet\.points\} PT/);
  assert.match(collapsed, /confirmed=\{playConfirmed\}/); assert.match(compact, /bet\.home\.logo/); assert.match(collapsed, /predictionLabel/);
});

test("storico replica la geometria compatta senza label o punti singoli", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const historical = client.slice(client.indexOf("function PastBetCard"), client.indexOf("function ConsistencyProgress"));
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function FantasyValues"));
  assert.match(historical, /<CompactBetCard/); assert.match(compact, /grid-cols-\[44px_minmax\(0,1fr\)_64px\]/); assert.doesNotMatch(historical, />GIOCATA</);
  assert.doesNotMatch(historical, /✓|✕|score\.points|\{bet\.points\} PT/); assert.match(compact, /border-emerald-300/); assert.match(compact, /border-rose-300/);
});

test("card compatte condividono corpo bianco e zona esito laterale", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function FantasyValues"));
  assert.match(compact, /bg-white/); assert.match(compact, /border-l-4/); assert.match(compact, /grid-cols-\[44px_minmax\(0,1fr\)_64px\]/);
  assert.match(compact, /bg-emerald-50/); assert.match(compact, /bg-rose-50/); assert.match(compact, /<CompactBetOutcome/);
});

test("corrente e storico condividono altezza, colonne e gerarchia responsive", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function FantasyValues"));
  const historical = client.slice(client.indexOf("function PastBetCard"), client.indexOf("function ConsistencyProgress"));
  assert.match(compact, /min-h-16/); assert.match(compact, /overflow-hidden/); assert.match(compact, /h-5 w-5/);
  assert.match(compact, /grid-rows-\[1fr_2fr\]/); assert.match(compact, /border-t border-current\/20/);
  assert.match(historical, /historical=\{true\}/); assert.match(historical, /FANTAPUNTEGGIO_1X2/);
  assert.doesNotMatch(historical, />GIOCATA<|text-\[7px\]|text-\[8px\]/);
});

test("colonna esito condivisa separa un terzo superiore e due terzi pronostico", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const outcome = client.slice(client.indexOf("function CompactBetOutcome"), client.indexOf("function TeamNameMarquee"));
  assert.match(outcome, /grid-rows-\[1fr_2fr\]/); assert.match(outcome, /border-t border-current\/20/);
  assert.match(outcome, /text-\[10px\].*sm:text-xs/); assert.match(outcome, /text-base.*sm:text-lg/);
  assert.match(outcome, /Risultato e pronostico/); assert.match(outcome, /Punti e pronostico/);
});

test("nome lungo demo usa marquee solo dopo misura overflow e rispetta reduced motion", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const demo = await readFile(new URL("./demo.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  const marquee = client.slice(client.indexOf("function TeamNameMarquee"), client.indexOf("function TeamHeader"));
  assert.match(demo, /Palermavaimavienimachisono/); assert.match(client, /<TeamNameMarquee name=\{bet\.home\.name\}/);
  assert.match(marquee, /measureText\.scrollWidth - container\.clientWidth/); assert.match(marquee, /useEffect/); assert.match(marquee, /distance > 0/);
  assert.match(marquee, /max-w-full truncate/); assert.match(marquee, /title=\{name\}/); assert.match(marquee, /aria-label=\{name\}/);
  assert.match(css, /@keyframes fantabet-team-name-marquee/); assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /animation: none/);
});

test("banner e Tipster Memorabili restano compatti su mobile", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /border-x border-white\/20/); assert.match(client, /gap-1 sm:h-6 sm:gap-2/);
  assert.match(client, /grid grid-cols-2 gap-2/); assert.match(client, /bg-white\/10 p-2 text-center.*sm:p-3/);
  assert.doesNotMatch(client, /overflow-x-auto[^\n]*I Tipster Memorabili/);
});

test("streak corrente gestisce blocchi successivi di cinque", () => {
  assert.deepEqual(currentStreakPresentation(0), { progress: 0, message: "Inizia la tua streak!" });
  assert.deepEqual(currentStreakPresentation(1), { progress: 1, message: "Completa altre 4 schedine per il tuo bonus!" });
  assert.deepEqual(currentStreakPresentation(4), { progress: 4, message: "Ancora 1 schedina per +10 PT!" });
  assert.deepEqual(currentStreakPresentation(5), { progress: 5, message: "Bonus costanza raggiunto!" });
  assert.deepEqual(currentStreakPresentation(6), { progress: 1, message: "Completa altre 4 schedine per il tuo bonus!" });
});

test("UI corrente mostra streak e risultato esatto morbido limitato a venti", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../../app/fantabet/actions.ts", import.meta.url), "utf8");
  assert.match(client, /<CurrentStreak streak=\{own\?\.streak_attuale \?\? 0\}/); assert.match(client, /Progresso Bonus Costanza/);
  assert.match(client, /max=\{20\}/); assert.match(client, /value === 20/); assert.match(client, /value === 0/);
  assert.match(actions, /input\.exactHome! > 20/); assert.match(actions, /input\.exactAway! > 20/);
  assert.doesNotMatch(client, /ring-black|border-black/); assert.match(client, /ring-slate-200\/60/);
});

test("streak è subito dopo il selettore e non entra nel ramo storico", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const navigation = client.indexOf("<RoundNavigation");
  const streak = client.indexOf("<CurrentStreak streak={own?.streak_attuale ?? 0}");
  const cardsGrid = client.indexOf("<div className=\"grid items-start gap-6");
  assert.ok(navigation < streak && streak < cardsGrid);
  assert.match(client.slice(navigation, cardsGrid), /!readOnlyRound && <div className="mb-5">/);
  const schedule = client.slice(client.indexOf("<section aria-label=\"Schedina FantaBet\""), client.indexOf("<LeaderboardSidebar"));
  assert.doesNotMatch(schedule, /<CurrentStreak/);
});

test("solo il mobile 1X2 divide POS PT e FPT.TOT su due righe centrate", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const choices = client.slice(client.indexOf("function VisualChoices"), client.indexOf("function ChoiceButton"));
  assert.match(choices, /grid grid-cols-2 place-items-center gap-x-1/); assert.match(choices, /sm:hidden/);
  assert.match(choices, /col-span-2 mt-0\.5 text-center/); assert.match(choices, /FPT\.TOT/);
  assert.match(choices, /hidden text-\[9px\].*sm:block/); assert.match(choices, /fantasy \? <span/);
});

test("Tipster Memorabili contiene due record con la stessa palette", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const records = client.slice(client.indexOf("function SeasonRecords"), client.indexOf("function FullLeaderboard"));
  assert.match(records, /LA SBANCATA/); assert.match(records, /L’IMPECCABILE/); assert.doesNotMatch(records, /CECCHINO|tones\[index\]/);
  assert.match(records, /grid grid-cols-2 gap-2/); assert.match(records, /records\.map\(\(record\) =>/);
  assert.match(records, /border border-amber-300\/60 bg-white\/10/); assert.doesNotMatch(records, /grid-cols-3|border-orange-300/);
});

test("card compatta ha tre aree, contenitore tipo e bordi soft", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const compact = client.slice(client.indexOf("function CompactBetCard"), client.indexOf("function CompactBetOutcome"));
  assert.match(compact, /grid-cols-\[44px_minmax\(0,1fr\)_64px\]/); assert.match(compact, /<CompactBetOutcome/);
  assert.match(compact, /rounded-lg border border-current\/15/); assert.match(compact, /accent\.badge/);
  assert.match(compact, /rounded-2xl border border-slate-200\/70/); assert.match(compact, /shadow-\[0_5px_16px/);
});

test("demo usa stemmi societari reali con fallback e nome lungo", async () => {
  const demo = await readFile(new URL("./demo.ts", import.meta.url), "utf8");
  assert.match(demo, /\/societa\/007_Interstellar\.png/); assert.match(demo, /\/societa\/014_Hellastronza\.png/);
  assert.match(demo, /\/societa\/008_Vivalapisa\.png/); assert.match(demo, /teamLogos\[index\] \?\? "\/logos\/logo\.png"/);
  assert.match(demo, /Palermavaimavienimachisono/);
});

test("FantaPT, podio e bonus usano il trattamento visuale rifinito", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /rounded-md border px-1 py-0\.5/); assert.match(client, /border-emerald-300 bg-emerald-50/); assert.match(client, /border-rose-300 bg-rose-50/);
  assert.match(client, /border-amber-400 bg-amber-200\/90/); assert.match(client, /border-slate-400 bg-slate-200\/90/); assert.match(client, /border-orange-400 bg-orange-200\/80/);
  assert.match(client, /absolute left-2 right-4 top-1\/2/); assert.match(client, /relative z-10 grid h-5/);
});

test("bonus usa orb grandi e quinto step +10 valorizzato", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /sm:h-6/); assert.match(client, /index === 4 \? "w-8 text-\[7px\] sm:w-10 sm:text-\[8px\]"/); assert.match(client, /index === 4 \? "\+10"/);
  assert.match(client, /from-amber-200 to-amber-400/); assert.match(client, /bg-white\/10/);
});

test("dropdown centra la giornata selezionata all'apertura", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /selectedOptionRef/); assert.match(client, /onToggle/); assert.match(client, /event\.currentTarget\.open/);
  assert.match(client, /selectedOptionRef\.current\?\.scrollIntoView\(\{ block: "center", behavior: "auto" \}\)/);
});

test("rank leaderboard usa colonna fissa centrata e numeri tabulari", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.match(client, /sm:grid-cols-\[32px_minmax\(0,1fr\)_28px_24px_38px\]/); assert.match(client, /w-7[^"`]*tabular-nums[^"`]*sm:w-8/);
});

test("leaderboard mostra la squadra fra username e giocate senza overflow mobile", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(client, /data-leaderboard-team-grid/);
  assert.match(client, /row\.team_logo[\s\S]*row\.team_name[\s\S]*Giornate giocate/);
  assert.match(client, /alt=\{`Logo \$\{row\.team_name\}`\}/); assert.match(client, /title=\{row\.team_name\}/);
  assert.match(client, /grid-cols-\[30px_minmax\(0,1fr\)_22px_22px_36px\]/);
  assert.match(client, /h-5 w-5 object-contain sm:h-6 sm:w-6/);
  assert.match(server, /const officialId = societyByProfile\.get\(row\.profile_id\) \?\? null/);
  assert.match(server, /const teamId = officialId \?\? supportByProfile\.get\(row\.profile_id\) \?\? null/);
  assert.match(server, /team_logo: team\?\.logo_path \?\? null/);
});

test("valore base delle giocate non usa il prefisso più", async () => {
  const client = await readFile(new URL("../../app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, />\+\{bet\.points\} PT/); assert.match(client, />\{bet\.points\} PT/);
});

test("migrazione correttiva nasconde submission senza round valutate e ricalcola le posizioni", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608080003_fantabet_leaderboard_visibility.sql", import.meta.url), "utf8");
  assert.match(migration, /where source\.giornate_giocate > 0/);
  assert.match(migration, /row_number\(\) over/);
  assert.match(migration, /private\.fantabet_global_leaderboard_unfiltered/);
  assert.doesNotMatch(migration, /auth\.users|\bemail\b/i);
});
