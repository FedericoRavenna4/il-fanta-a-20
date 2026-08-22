import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=(path)=>readFile(new URL(path,import.meta.url),"utf8");
const core=await read("../supabase/migrations/202608070003_fantabet.sql");
const roundLeaderboard=await read("../supabase/migrations/202608080002_fantabet_round_leaderboard.sql");
const submissions=await read("../supabase/migrations/202608080001_fantabet_round_submissions.sql");
const emblems=await read("../supabase/migrations/202608100005_user_emblems.sql");
const calendar=await read("../supabase/migrations/202608220001_atomic_calendar_publish.sql");
const atomicDraft=await read("../supabase/migrations/202608220004_atomic_fantabet_draft.sql");
const profile=await read("../supabase/migrations/202608210005_extend_profile_arcade_position.sql");

test("4/5 resta non valutabile e 5/5 abilita tutte le fonti derivate",()=>{
  assert.match(core,/count\(\*\) = round\.required_predictions and bool_and\(result\.resolvable\) as fully_evaluable/);
  assert.match(roundLeaderboard,/evaluation\.fully_evaluable/);
  assert.match(submissions,/complete_rounds as \([\s\S]*fully_evaluable/);
});

test("classifiche giornata e generale condividono risultati e tie-break deterministici",()=>{
  assert.match(roundLeaderboard,/private\.fantabet_prediction_results/);
  assert.match(roundLeaderboard,/punti_pronostici \+ totals\.punti_bonus_costanza desc[\s\S]*schedina_perfetta desc[\s\S]*pronostici_corretti desc[\s\S]*username_normalizzato asc[\s\S]*profile_id asc/);
  assert.match(submissions,/private\.fantabet_prediction_results/);
  assert.match(submissions,/punti_totali desc[\s\S]*schedine_perfette desc[\s\S]*pronostici_corretti desc[\s\S]*username_normalizzato asc[\s\S]*profile_id asc/);
});

test("correzioni calendario ricalcolano view, profilo e Tipster senza ledger stale",()=>{
  assert.match(core,/from public\.fantabet_bets bet[\s\S]*join public\.partite match/);
  assert.doesNotMatch(core+roundLeaderboard+submissions,/create table public\.fantabet_(scores|leaderboard|statistics)/i);
  assert.match(profile,/from public\.fantabet_global_leaderboard\(\)/);
  assert.match(calendar,/on conflict\(edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id\) do update set[\s\S]*fantapunti_casa=excluded\.fantapunti_casa[\s\S]*gol_casa=excluded\.gol_casa/);
});

test("Tipster e schedina perfetta attendono round completa anche alla prima giornata",()=>{
  assert.match(emblems,/evaluation\.fully_evaluable/);
  assert.match(emblems,/partition by scored\.round_id[\s\S]*row_number\(\)/);
  assert.match(emblems,/emblem\.slug = 'top-tipster'/);
  assert.match(emblems,/emblem\.slug = 'schedina-perfetta'/);
  assert.doesNotMatch(emblems,/numero_giornata\s*>\s*1/);
});

test("unlock FantaBet sono permanenti e idempotenti dopo correzioni",()=>{
  assert.match(emblems,/insert into public\.user_emblem_unlocks/g);
  assert.match(emblems,/on conflict do nothing/g);
  assert.doesNotMatch(emblems,/delete from public\.user_emblem_unlocks/);
  assert.match(emblems,/after update of stato, gol_casa, gol_trasferta, fantapunti_casa, fantapunti_trasferta/);
});

test("deadline è enforced da policy trigger e RPC submission",()=>{
  assert.match(core,/fantabet_prediction_window_open[\s\S]*statement_timestamp\(\) < round\.deadline_at/);
  assert.match(core,/fantabet_predictions_validate/);
  assert.match(submissions,/if submitted >= deadline then raise exception 'FANTABET_DEADLINE_SCADUTA'/);
});

test("publish calendario preserva riferimenti FantaBet e consente UPDATE risultati",()=>{
  assert.match(calendar,/fantabet_bets[\s\S]*CALENDAR_OBSOLETE_MATCH_HAS_DEPENDENCIES/);
  assert.match(calendar,/on conflict\(edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id\) do update/);
  assert.doesNotMatch(calendar,/delete from public\.fantabet_/);
});

test("bozza atomica non introduce un secondo sistema di scoring",()=>{
  assert.match(atomicDraft,/delete from public\.fantabet_bets[\s\S]*insert into public\.fantabet_bets/);
  assert.doesNotMatch(atomicDraft,/fantabet_prediction_results|fantabet_global_leaderboard|user_emblem_unlocks/);
});
