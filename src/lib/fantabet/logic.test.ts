import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateConsistencyBonus, calculateGlobalLeaderboard, hasValidRoundConfiguration, isExactResultCorrect, isPredictionWindowOpen, resolveFantasyPoints1X2, resolveGoals1X2, resolveUnderOver, scorePlay, scoreRound, wasRoundPlayableAfterRegistration } from "./logic.ts";
import type { FantaBetMatchResult, FantaBetPlay } from "./types.ts";

const result = (homeGoals: number | null, awayGoals: number | null, homeFantasyPoints: number | null = 70, awayFantasyPoints: number | null = 65, status = "calcolata"): FantaBetMatchResult => ({ status, homeGoals, awayGoals, homeFantasyPoints, awayFantasyPoints });
const plays = (wrongLast = false): FantaBetPlay[] => [
  { id: 1, matchId: 11, type: "1X2", pointsValue: 3, displayOrder: 1, prediction: { choice: "1" }, result: result(2, 1) },
  { id: 2, matchId: 12, type: "1X2", pointsValue: 3, displayOrder: 2, prediction: { choice: "X" }, result: result(0, 0) },
  { id: 3, matchId: 13, type: "UNDER_OVER_2_5", pointsValue: 1, displayOrder: 3, prediction: { choice: "OVER" }, result: result(3, 1) },
  { id: 4, matchId: 14, type: "RISULTATO_ESATTO", pointsValue: 10, displayOrder: 4, prediction: { choice: "ESATTO", exactHome: 2, exactAway: 0 }, result: result(2, 0) },
  { id: 5, matchId: 15, type: "FANTAPUNTEGGIO_1X2", pointsValue: 2, displayOrder: 5, prediction: { choice: wrongLast ? "2" : "1" }, result: result(1, 0, 72.5, 66) },
];
const zeroCorrectPlays = (): FantaBetPlay[] => plays().map((play) => {
  if (play.type === "RISULTATO_ESATTO") return { ...play, prediction: { choice: "ESATTO", exactHome: 9, exactAway: 9 } };
  if (play.type === "UNDER_OVER_2_5") return { ...play, prediction: { choice: "UNDER" } };
  return { ...play, prediction: { choice: play.prediction.choice === "1" ? "2" : "1" } };
});

test("esito 1X2: 1 corretto/errato, X e 2", () => {
  assert.equal(resolveGoals1X2(result(2, 1)), "1");
  assert.equal(resolveGoals1X2(result(1, 1)), "X");
  assert.equal(resolveGoals1X2(result(0, 2)), "2");
  assert.deepEqual(scorePlay("1X2", 3, { choice: "1" }, result(2, 1)), { evaluable: true, correct: true, points: 3 });
  assert.equal(scorePlay("1X2", 3, { choice: "2" }, result(2, 1)).points, 0);
});

test("Under con 0, 1, 2 gol e Over con almeno 3", () => {
  for (const [home, away] of [[0, 0], [1, 0], [1, 1]]) assert.equal(resolveUnderOver(result(home, away)), "UNDER");
  assert.equal(resolveUnderOver(result(2, 1)), "OVER");
  assert.equal(resolveUnderOver(result(4, 3)), "OVER");
});

test("risultato esatto corretto ed errato", () => {
  assert.equal(isExactResultCorrect({ choice: "ESATTO", exactHome: 2, exactAway: 1 }, result(2, 1)), true);
  assert.equal(isExactResultCorrect({ choice: "ESATTO", exactHome: 1, exactAway: 2 }, result(2, 1)), false);
});

test("fantapunteggio: casa, pareggio e ospite", () => {
  assert.equal(resolveFantasyPoints1X2(result(1, 0, 70, 65)), "1");
  assert.equal(resolveFantasyPoints1X2(result(1, 0, 66, 66)), "X");
  assert.equal(resolveFantasyPoints1X2(result(1, 0, 65, 70)), "2");
});

test("5/5 raddoppia fino a 38; 4/5 non raddoppia", () => {
  assert.deepEqual(scoreRound(plays()), { evaluable: true, basePoints: 19, finalPoints: 38, correctPredictions: 5, perfect: true });
  assert.deepEqual(scoreRound(plays(true)), { evaluable: true, basePoints: 17, finalPoints: 17, correctPredictions: 4, perfect: false });
});

test("deadline: modifica prima, blocco esatto e dopo", () => {
  const round = { status: "pubblicata", opensAt: "2026-08-07T10:00:00Z", deadlineAt: "2026-08-07T20:00:00Z" };
  assert.equal(isPredictionWindowOpen(round, "2026-08-07T12:00:00Z"), true);
  assert.equal(isPredictionWindowOpen(round, "2026-08-07T20:00:00Z"), false);
  assert.equal(isPredictionWindowOpen(round, "2026-08-07T20:00:01Z"), false);
});

test("nuovo account partecipa alla round aperta ma non eredita round già scadute", () => {
  assert.equal(wasRoundPlayableAfterRegistration("2026-08-08T20:00:00Z", "2026-08-08T12:00:00Z"), true);
  assert.equal(wasRoundPlayableAfterRegistration("2026-08-08T12:00:00Z", "2026-08-08T12:00:00Z"), false);
  assert.equal(wasRoundPlayableAfterRegistration("2026-08-08T10:00:00Z", "2026-08-08T12:00:00Z"), false);
});

test("dati mancanti, stato non calcolato e round incompleta non assegnano zero", () => {
  assert.equal(scorePlay("1X2", 3, { choice: "X" }, result(null, null, null, null, "rinviata")).points, null);
  assert.equal(scorePlay("FANTAPUNTEGGIO_1X2", 2, { choice: "1" }, result(1, 0, null, 66)).evaluable, false);
  assert.equal(scoreRound(plays().slice(0, 4)).evaluable, false);
  assert.equal(hasValidRoundConfiguration([...plays().slice(0, 4), { ...plays()[4], matchId: 11 }]), false);
});

test("classifica globale deriva punteggi e applica tie-break deterministico", () => {
  const perfect = scoreRound(plays());
  const four = scoreRound(plays(true));
  const rows = calculateGlobalLeaderboard([
    { profileId: "b", username: "Beta", normalizedUsername: "beta", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: four },
    { profileId: "a", username: "Alfa", normalizedUsername: "alfa", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: perfect },
    { profileId: "b", username: "Beta", normalizedUsername: "beta", roundId: 2, roundOrder: 2, submitted: true, predictionCount: 5, score: four },
  ]);
  assert.deepEqual(rows.map(({ profileId, totalPoints, roundsPlayed, position }) => ({ profileId, totalPoints, roundsPlayed, position })), [
    { profileId: "a", totalPoints: 38, roundsPlayed: 1, position: 1 },
    { profileId: "b", totalPoints: 34, roundsPlayed: 2, position: 2 },
  ]);
  const tied = calculateGlobalLeaderboard([
    { profileId: "z", username: "Zulu", normalizedUsername: "zulu", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: four },
    { profileId: "a", username: "Alfa", normalizedUsername: "alfa", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: four },
  ]);
  assert.deepEqual(tied.map((row) => row.profileId), ["a", "z"]);
});

test("schedine 1/5 e 4/5 restano escluse dalla leaderboard", () => {
  const incomplete = scoreRound(plays().slice(0, 4));
  for (const predictionCount of [1, 4]) {
    const rows = calculateGlobalLeaderboard([
      { profileId: "partial", username: "Partial", normalizedUsername: "partial", roundId: 1, roundOrder: 1, submitted: false, predictionCount, score: incomplete },
    ]);
    assert.deepEqual(rows, []);
  }
});

test("5/5 senza submission non giocano, con submission entrano in classifica", () => {
  const base = { profileId: "authoritative", username: "Authoritative", normalizedUsername: "authoritative", roundId: 1, roundOrder: 1, predictionCount: 5, score: scoreRound(plays()) };
  assert.deepEqual(calculateGlobalLeaderboard([{ ...base, submitted: false }]), []);
  const [confirmed] = calculateGlobalLeaderboard([{ ...base, submitted: true }]);
  assert.deepEqual({ rounds: confirmed.roundsPlayed, points: confirmed.predictionPoints, perfect: confirmed.perfectSlips }, { rounds: 1, points: 38, perfect: 1 });
});

test("modifica invalida la submission; solo la riconferma rende di nuovo valida la giornata", () => {
  const base = { profileId: "edited", username: "Edited", normalizedUsername: "edited", roundId: 1, roundOrder: 1, predictionCount: 5, score: scoreRound(plays(true)) };
  assert.equal(calculateGlobalLeaderboard([{ ...base, submitted: true }]).length, 1);
  assert.deepEqual(calculateGlobalLeaderboard([{ ...base, submitted: false }]), []);
  assert.equal(calculateGlobalLeaderboard([{ ...base, submitted: true }])[0].roundsPlayed, 1);
});

test("una schedina completa non confermata interrompe la streak autorevole", () => {
  const rounds = [true, true, false, true, true].map((submitted) => ({ submitted, predictionCount: 5 }));
  assert.deepEqual(calculateConsistencyBonus(rounds), { bonusPoints: 0, currentStreak: 2 });
});

test("prima submission aperta o non valutabile non rende visibile il profilo", () => {
  assert.deepEqual(calculateGlobalLeaderboard([{
    profileId: "new", username: "New", normalizedUsername: "new", roundId: 1, roundOrder: 1,
    submitted: true, expired: false, predictionCount: 5, score: scoreRound(plays()),
  }]), []);
  assert.deepEqual(calculateGlobalLeaderboard([{
    profileId: "pending", username: "Pending", normalizedUsername: "pending", roundId: 1, roundOrder: 1,
    submitted: true, expired: true, predictionCount: 5, score: { evaluable: false, basePoints: null, finalPoints: null, correctPredictions: null, perfect: false },
  }]), []);
  assert.deepEqual(calculateGlobalLeaderboard([{
    profileId: "deleted", username: "Deleted", normalizedUsername: "deleted", roundId: 1, roundOrder: 1,
    submitted: false, expired: false, predictionCount: 5, score: scoreRound(plays()),
  }]), []);
});

test("prima round valutata rende visibile il profilo e lo storico resta durante la round aperta", () => {
  const entries = [{
    profileId: "history", username: "History", normalizedUsername: "history", roundId: 1, roundOrder: 1,
    submitted: true, expired: true, predictionCount: 5, score: scoreRound(plays(true)),
  }, {
    profileId: "history", username: "History", normalizedUsername: "history", roundId: 2, roundOrder: 2,
    submitted: true, expired: false, predictionCount: 5, score: scoreRound(plays()),
  }];
  const [row] = calculateGlobalLeaderboard(entries);
  assert.deepEqual({ points: row.totalPoints, rounds: row.roundsPlayed, streak: row.currentStreak }, { points: 17, rounds: 1, streak: 1 });
});

test("round aperta con submission non incrementa streak o bonus prematuramente", () => {
  const entries = Array.from({ length: 5 }, (_, index) => ({
    profileId: "open", username: "Open", normalizedUsername: "open", roundId: index + 1, roundOrder: index + 1,
    submitted: true, expired: index < 4, predictionCount: 5, score: scoreRound(plays(true)),
  }));
  const [row] = calculateGlobalLeaderboard(entries);
  assert.deepEqual({ bonus: row.consistencyBonusPoints, streak: row.currentStreak, rounds: row.roundsPlayed }, { bonus: 0, streak: 4, rounds: 4 });
});

test("5 pronostici con 4 corretti contano una giornata senza bonus perfetta", () => {
  const [row] = calculateGlobalLeaderboard([
    { profileId: "four", username: "Four", normalizedUsername: "four", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: scoreRound(plays(true)) },
  ]);
  assert.deepEqual({ rounds: row.roundsPlayed, points: row.predictionPoints, perfect: row.perfectSlips }, { rounds: 1, points: 17, perfect: 0 });
});

test("5 pronostici corretti contano una giornata, 38 punti e una perfetta", () => {
  const [row] = calculateGlobalLeaderboard([
    { profileId: "perfect", username: "Perfect", normalizedUsername: "perfect", roundId: 1, roundOrder: 1, submitted: true, predictionCount: 5, score: scoreRound(plays()) },
  ]);
  assert.deepEqual({ rounds: row.roundsPlayed, points: row.predictionPoints, perfect: row.perfectSlips }, { rounds: 1, points: 38, perfect: 1 });
});

test("bonus costanza: 4, 5, 9, 10 e 15 giornate consecutive", () => {
  const complete = (count: number) => Array.from({ length: count }, () => ({ submitted: true, predictionCount: 5 }));
  assert.deepEqual(calculateConsistencyBonus(complete(4)), { bonusPoints: 0, currentStreak: 4 });
  assert.deepEqual(calculateConsistencyBonus(complete(5)), { bonusPoints: 10, currentStreak: 5 });
  assert.deepEqual(calculateConsistencyBonus(complete(9)), { bonusPoints: 10, currentStreak: 9 });
  assert.deepEqual(calculateConsistencyBonus(complete(10)), { bonusPoints: 20, currentStreak: 10 });
  assert.deepEqual(calculateConsistencyBonus(complete(15)), { bonusPoints: 30, currentStreak: 15 });
});

test("una giornata saltata o 4/5 interrompe la streak senza cancellare bonus maturati", () => {
  const sequence = [5, 5, 5, 5, 5, 0, 5, 5, 5, 5].map((predictionCount) => ({ submitted: true, predictionCount }));
  assert.deepEqual(calculateConsistencyBonus(sequence), { bonusPoints: 10, currentStreak: 4 });
  assert.deepEqual(calculateConsistencyBonus([5, 5, 5, 5, 4, 5].map((predictionCount) => ({ submitted: true, predictionCount }))), { bonusPoints: 0, currentStreak: 1 });
});

test("streak attuale rappresenta esattamente le complete consecutive più recenti", () => {
  const sequence = (values: Array<"C" | "I" | "A">) => values.map((value) => ({
    submitted: value === "C" || value === "A",
    predictionCount: value === "C" || value === "A" ? 5 : 4,
    roundStatus: value === "A" ? "annullata" : "chiusa",
  }));
  assert.equal(calculateConsistencyBonus(sequence(["C", "C", "C"])).currentStreak, 3);
  assert.equal(calculateConsistencyBonus(sequence(["C", "C", "I"])).currentStreak, 0);
  assert.equal(calculateConsistencyBonus(sequence(["C", "C", "I", "C"])).currentStreak, 1);
  assert.equal(calculateConsistencyBonus(sequence(["C", "C", "I", "C", "C"])).currentStreak, 2);
  assert.equal(calculateConsistencyBonus(sequence(["C", "C", "A", "C", "C"])).currentStreak, 4);
});

test("round annullata interposta è ignorata e cinque complete assegnano +10", () => {
  const rounds = ["C", "C", "A", "C", "C", "C"].map((value) => ({
    submitted: true,
    predictionCount: 5,
    roundStatus: value === "A" ? "annullata" : "chiusa",
  }));
  assert.deepEqual(calculateConsistencyBonus(rounds), { bonusPoints: 10, currentStreak: 5 });
});

test("round annullata non assegna punti e non crea un ingresso leaderboard", () => {
  const perfect = scoreRound(plays());
  assert.deepEqual(calculateGlobalLeaderboard([
    { profileId: "cancelled", username: "Cancelled", normalizedUsername: "cancelled", roundId: 1, roundOrder: 1, roundStatus: "annullata", submitted: true, predictionCount: 5, score: perfect },
  ]), []);
  const [row] = calculateGlobalLeaderboard([
    { profileId: "valid", username: "Valid", normalizedUsername: "valid", roundId: 1, roundOrder: 1, roundStatus: "chiusa", submitted: true, predictionCount: 5, score: perfect },
    { profileId: "valid", username: "Valid", normalizedUsername: "valid", roundId: 2, roundOrder: 2, roundStatus: "annullata", submitted: true, predictionCount: 5, score: perfect },
  ]);
  assert.deepEqual({ rounds: row.roundsPlayed, predictions: row.predictionPoints, streak: row.currentStreak }, { rounds: 1, predictions: 38, streak: 1 });
});

test("round rinviata non spezza la streak se la schedina è completa", () => {
  const unevaluable = scoreRound(plays().map((play) => ({ ...play, result: { ...play.result, status: "rinviata" } })));
  const entries = Array.from({ length: 5 }, (_, index) => ({
    profileId: "steady", username: "Steady", normalizedUsername: "steady", roundId: index + 1,
    roundOrder: index + 1, submitted: true, predictionCount: 5, score: index === 2 ? unevaluable : scoreRound(plays(true)),
  }));
  const [row] = calculateGlobalLeaderboard(entries);
  assert.equal(row.currentStreak, 5);
  assert.equal(row.consistencyBonusPoints, 10);
  assert.equal(row.roundsPlayed, 4);
});

test("schedina completa con zero risposte corrette mantiene la streak", () => {
  const zeroCorrect = scoreRound(zeroCorrectPlays());
  assert.deepEqual({ points: zeroCorrect.finalPoints, correct: zeroCorrect.correctPredictions }, { points: 0, correct: 0 });
  const entries = Array.from({ length: 5 }, (_, index) => ({
    profileId: "present", username: "Present", normalizedUsername: "present", roundId: index + 1,
    roundOrder: index + 1, submitted: true, predictionCount: 5, score: zeroCorrect,
  }));
  const [row] = calculateGlobalLeaderboard(entries);
  assert.deepEqual({ streak: row.currentStreak, bonus: row.consistencyBonusPoints, rounds: row.roundsPlayed }, { streak: 5, bonus: 10, rounds: 5 });
});

test("bonus costanza non viene raddoppiato dalla schedina perfetta", () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    profileId: "perfect", username: "Perfect", normalizedUsername: "perfect", roundId: index + 1,
    roundOrder: index + 1, submitted: true, predictionCount: 5, score: scoreRound(plays()),
  }));
  const [row] = calculateGlobalLeaderboard(rows);
  assert.deepEqual({ predictions: row.predictionPoints, bonus: row.consistencyBonusPoints, total: row.totalPoints }, { predictions: 190, bonus: 10, total: 200 });
});

test("quinta consecutiva perfetta vale 38 punti pronostico più 10 bonus", () => {
  const zeroCorrect = scoreRound(zeroCorrectPlays());
  const rows = Array.from({ length: 5 }, (_, index) => ({
    profileId: "fifth", username: "Fifth", normalizedUsername: "fifth", roundId: index + 1,
    roundOrder: index + 1, submitted: true, predictionCount: 5, score: index === 4 ? scoreRound(plays()) : zeroCorrect,
  }));
  const [row] = calculateGlobalLeaderboard(rows);
  assert.deepEqual({ predictions: row.predictionPoints, bonus: row.consistencyBonusPoints, total: row.totalPoints }, { predictions: 38, bonus: 10, total: 48 });
});

test("migrazione impone unique, ownership RLS e tempo database", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  assert.match(migration, /unique\s*\(profile_id, bet_id\)/i);
  assert.match(migration, /\(select auth\.uid\(\)\) = profile_id/i);
  assert.match(migration, /fantabet_prediction_window_open\(bet_id\)/i);
  assert.match(migration, /statement_timestamp\(\)/i);
  assert.doesNotMatch(migration, /grant[^;]*delete[^;]*fantabet_predictions[^;]*authenticated/is);
});

test("migrazione valida la schedina canonica e mantiene i punteggi derivati", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  assert.match(migration, /total_bets <> 5/);
  assert.match(migration, /bet_type = '1X2'\) <> 2/);
  for (const rule of ["UNDER_OVER_2_5", "RISULTATO_ESATTO", "FANTAPUNTEGGIO_1X2"]) assert.match(migration, new RegExp(`bet_type = '${rule}'\\) <> 1`));
  assert.match(migration, /unique \(round_id, partita_id\)/i);
  assert.match(migration, /unique \(round_id, display_order\)/i);
  assert.doesNotMatch(migration, /create table public\.fantabet_(?:round_)?scores/i);
  assert.match(migration, /create or replace function public\.fantabet_global_leaderboard/i);
});

test("SQL valuta solo partite calcolate e round interamente risolvibili", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  assert.match(migration, /match\.stato <> 'calcolata' then false/i);
  assert.match(migration, /fantapunti_casa is not null and match\.fantapunti_trasferta is not null/i);
  assert.match(migration, /count\(\*\) = round\.required_predictions and bool_and\(result\.resolvable\)/i);
  assert.match(migration, /group by result\.round_id, round\.required_predictions/i);
  assert.match(migration, /where fully_evaluable/i);
});

test("SQL esclude le schedine parziali senza cancellarne i pronostici e non espone Auth", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  assert.match(migration, /where score\.prediction_count = score\.required_predictions/i);
  assert.doesNotMatch(migration, /delete from public\.fantabet_predictions/i);
  const leaderboard = migration.slice(migration.indexOf("create or replace function public.fantabet_global_leaderboard"));
  assert.doesNotMatch(leaderboard, /auth\.users|\bemail\b/i);
});

test("round V1 fotografa regole e bonus e li rende immutabili dopo la pubblicazione", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  for (const field of ["round_type", "rules_version", "required_predictions", "perfect_multiplier", "consistency_block_size", "consistency_bonus_points"]) {
    assert.match(migration, new RegExp(`${field}[^\\n]+not null`, "i"));
    assert.match(migration, new RegExp(`new\\.${field} is distinct from old\\.${field}`, "i"));
  }
  assert.match(migration, /FANTABET_CONFIGURAZIONE_PUBBLICATA_IMMUTABILE/);
  assert.match(migration, /new\.deadline_at is distinct from old\.deadline_at/);
  assert.match(migration, /new\.deadline_at <= statement_timestamp\(\)/);
  assert.match(migration, /new\.round_type <> 'STANDARD' or new\.rules_version <> 1/i);
  assert.match(migration, /new\.required_predictions <> 5 or new\.perfect_multiplier <> 2/i);
});

test("completezza e bonus SQL usano la configurazione congelata della round", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  assert.match(migration, /prediction_count = score\.required_predictions/i);
  assert.match(migration, /prediction_count = required_predictions/i);
  assert.match(migration, /mod\(streak_position, consistency_block_size\) = 0 then consistency_bonus_points/i);
  assert.match(migration, /select timeline\.\*[\s\S]*from participation_timeline timeline[\s\S]*where timeline\.complete/i);
  assert.match(migration, /round\.deadline_at <= statement_timestamp\(\)/i);
  assert.match(migration, /from public\.fantabet_predictions prediction[\s\S]*count\(\*\)::integer as prediction_count/i);
  assert.doesNotMatch(migration, /delete from public\.fantabet_predictions/i);
});

test("SQL ignora completamente le round annullate ma mantiene le valide non valutabili nella streak", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608070003_fantabet.sql", import.meta.url), "utf8");
  const leaderboard = migration.slice(migration.indexOf("create or replace function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /where round\.status in \('pubblicata', 'chiusa', 'valutata'\)/i);
  assert.doesNotMatch(leaderboard, /expired_rounds[\s\S]*?round\.status[^\n]*annullata/i);
  assert.match(leaderboard, /participation_counts[\s\S]*?join expired_rounds round/i);
  assert.match(migration, /when match\.stato <> 'calcolata' then false/i);
});

test("0004 rende submission autorevole per punteggi e partecipazione", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608080001_fantabet_round_submissions.sql", import.meta.url), "utf8");
  const leaderboard = migration.slice(migration.indexOf("create or replace function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /from private\.fantabet_prediction_results result[\s\S]*join public\.fantabet_round_submissions submission[\s\S]*submission\.profile_id = result\.profile_id[\s\S]*submission\.round_id = result\.round_id/i);
  assert.match(leaderboard, /submitted_participation[\s\S]*from public\.fantabet_round_submissions submission[\s\S]*join expired_rounds round/i);
  assert.match(leaderboard, /participation\.round_id is not null as complete/i);
  assert.doesNotMatch(leaderboard, /from public\.fantabet_predictions prediction[\s\S]*participation_counts/i);
  assert.match(leaderboard, /where round\.status in \('pubblicata', 'chiusa', 'valutata'\)/i);
  assert.doesNotMatch(leaderboard, /expired_rounds[\s\S]*?round\.status[^\n]*annullata/i);
});

test("0004 include submission aperte nell'universo ma non nella timeline", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608080001_fantabet_round_submissions.sql", import.meta.url), "utf8");
  assert.match(migration, /participating_profiles as \([\s\S]*from public\.fantabet_round_submissions submission[\s\S]*join public\.fantabet_rounds round[\s\S]*where round\.status in \('pubblicata', 'chiusa', 'valutata'\)/i);
  assert.doesNotMatch(migration, /participating_profiles as \([\s\S]*?from submitted_participation[\s\S]*?\)/i);
  assert.match(migration, /submitted_participation as \([\s\S]*join expired_rounds round on round\.id = submission\.round_id/i);
  assert.match(migration, /join expired_rounds round on round\.deadline_at > profile\.created_at/i);
  assert.doesNotMatch(migration, /round\.deadline_at >= profile\.created_at/i);
});

test("0004 invalida submission sulle modifiche reali e consente riconferma solo pre-deadline", async () => {
  const migration = await readFile(new URL("../../../supabase/migrations/202608080001_fantabet_round_submissions.sql", import.meta.url), "utf8");
  assert.match(migration, /old\.scelta is not distinct from new\.scelta/i);
  assert.match(migration, /delete from public\.fantabet_round_submissions[\s\S]*profile_id = new\.profile_id/i);
  assert.match(migration, /on conflict \(profile_id, round_id\) do update/i);
  assert.match(migration, /if submitted >= deadline then raise exception 'FANTABET_DEADLINE_SCADUTA'/i);
  assert.match(migration, /if actual_count <> expected_count then raise exception 'FANTABET_SCHEDINA_INCOMPLETA'/i);
});
