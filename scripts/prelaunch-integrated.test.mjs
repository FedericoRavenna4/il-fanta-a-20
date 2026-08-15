import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const roseMigration=await readFile(new URL("../supabase/migrations/202608150002_rose_import.sql",import.meta.url),"utf8");
const emblemMigration=await readFile(new URL("../supabase/migrations/202608150001_societa_support_emblems.sql",import.meta.url),"utf8");
const supportMigration=await readFile(new URL("../supabase/migrations/202608090003_fantabet_support_match_points.sql",import.meta.url),"utf8");
const userMigration=await readFile(new URL("../supabase/migrations/202608100005_user_emblems.sql",import.meta.url),"utf8");
const calendar=await readFile(new URL("../src/lib/admin-import/calendar-sync.ts",import.meta.url),"utf8");
const page=await readFile(new URL("../src/app/societa/[slug]/page.tsx",import.meta.url),"utf8");
const roseLoader=await readFile(new URL("../src/lib/rose-current.server.ts",import.meta.url),"utf8");

test("fotografia Rose e reimport calendario restano idempotenti e separati",()=>{assert.match(roseMigration,/unique \(stagione_id, giocatore_normalizzato\)/);assert.match(roseMigration,/on conflict \(stagione_id, giocatore_normalizzato\) do update/);assert.match(roseMigration,/delete from public\.rose_giocatori/);assert.match(calendar,/safeRows/);assert.doesNotMatch(calendar,/delete[\s\S]*calcolata/i);});
test("giornata calcolata collega Tifo Emblemi utente e Emblemi Società",()=>{assert.match(supportMigration,/after insert or update of stato, gol_casa, gol_trasferta on public\.partite/);assert.match(userMigration,/user_emblems_after_match_evaluation[\s\S]*on public\.partite/);assert.match(emblemMigration,/societa_emblems_after_match_evaluation[\s\S]*on public\.partite/);});
test("scheda società usa Rose Supabase con fake OFF e fixture soltanto con fake ON",()=>{assert.match(page,/loadRoseForSocieta\(team\.id\)/);assert.doesNotMatch(page,/getRose\(\)/);assert.match(roseLoader,/if \(isGlobalFakeDataEnabled\(\)\) \{\s*return getRose\(\)\.filter/);assert.equal((roseLoader.match(/getRose\(\)/g)??[]).length,1);assert.match(roseLoader,/from\("rose_giocatori"\)/);assert.doesNotMatch(roseLoader,/if \(seasonError \|\| !season\) return legacy|historical = legacy\.filter/);});
test("nessuna scrittura client per Rose o Emblemi",()=>{assert.match(roseMigration,/enable row level security/);assert.match(roseMigration,/revoke all/);for(const sql of [roseMigration,emblemMigration]){assert.match(sql,/security definer/);assert.match(sql,/set search_path = ''/);}assert.match(emblemMigration,/revoke all on function private\.sync_societa_support_emblems\(\) from public, anon, authenticated/);assert.doesNotMatch(emblemMigration,/grant[^;]+to (?:anon|authenticated)/i);});
