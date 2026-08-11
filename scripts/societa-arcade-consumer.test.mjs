import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Gioca usa identità attiva Supabase senza fallback CSV", async () => {
  const source = await read("src/app/gioca/page.tsx");

  assert.match(source, /await getActiveSocietaCatalog\(\)/);
  assert.match(source, /slug: team\.slug/);
  assert.match(source, /nome: team\.nome/);
  assert.match(source, /logo: team\.logo_path \?\? "\/logo\.png"/);
  assert.match(source, /getLeagueLabel\(team\.categoria, team\.girone\)/);
  assert.doesNotMatch(source, /getSocieta|societa\.csv|slugify/);
  assert.doesNotMatch(source, /find\([^\n]*nome/);
});

test("validazione societa_id usa il lookup attivo condiviso con la stessa risposta booleana", async () => {
  const source = await read("src/lib/arcade/server.ts");

  assert.match(source, /getActiveSocietaById\(value\)/);
  assert.match(source, /if \(!Number\.isInteger\(value\)\) return false/);
  assert.match(source, /return Boolean\(await getActiveSocietaById\(value\)\)/);
  assert.match(source, /!\(await isValidTeam\(societaId\)\)/);
  assert.match(source, /!\(await isValidTeam\(payload\.societaId\)\)/);
  assert.doesNotMatch(source, /getSocieta|societa\.csv/);
});

test("record storici non vengono filtrati in base al catalogo società", async () => {
  const source = await read("src/lib/arcade/server.ts");

  const loader = source.slice(source.indexOf("async function loadDeduplicatedLeaderboard"), source.indexOf("function leaderboardEntryId"));
  assert.match(loader, /from\("classifica_arcade"\)/);
  assert.doesNotMatch(loader, /isValidTeam|getActiveSocieta|societaById/);
});

test("Player ID, nickname, token e record mantengono le RPC esistenti", async () => {
  const [server, identityMigration, tokenMigration] = await Promise.all([
    read("src/lib/arcade/server.ts"),
    read("supabase/migrations/202608020002_arcade_player_identity.sql"),
    read("supabase/migrations/202608020003_arcade_player_identity_token_validation.sql"),
  ]);

  assert.match(server, /rpc\("assegna_nickname_arcade"/);
  assert.match(server, /rpc\("consuma_arcade_run_token_v2"/);
  assert.match(server, /rpc\("salva_record_arcade_v3"/);
  assert.match(identityMigration, /found and v_owner <> p_player_id/);
  assert.match(identityMigration, /'nickname_taken'/);
  assert.match(identityMigration, /on conflict \(player_id\) do update/);
  assert.match(tokenMigration, /where nonce = p_nonce\s+and used_at is null/);
  assert.match(tokenMigration, /if not found then\s+return query select 'invalid'/);
  assert.match(tokenMigration, /p_livello not between 1 and 3/);
  assert.match(tokenMigration, /p_livello > coalesce\(v_record\.livello, 1\)/);
  assert.match(tokenMigration, /p_metri > v_record\.metri/);
});

test("la fase identità non modifica scoring, deduplicazione o migrazioni Arcade", async () => {
  const [runner, leaderboard] = await Promise.all([
    read("src/app/gioca/FantaRunner.tsx"),
    read("src/lib/arcade/leaderboard.ts"),
  ]);

  assert.match(runner, /teamRating|recordCelebrationDistance/);
  assert.match(leaderboard, /deduplicateArcadeLeaderboard/);
  assert.match(leaderboard, /candidate\.playerId/);
});
