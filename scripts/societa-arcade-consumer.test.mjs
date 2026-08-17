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

test("Account, token e record usano le RPC account-based senza identità client", async () => {
  const [server, accountMigration] = await Promise.all([
    read("src/lib/arcade/server.ts"),
    read("supabase/migrations/202608170001_arcade_account_identity.sql"),
  ]);

  assert.match(server, /auth\.getUser\(\)/);
  assert.match(server, /rpc\("consuma_arcade_run_token_v3"/);
  assert.match(server, /rpc\("salva_record_arcade_v4"/);
  assert.doesNotMatch(server, /input\.(?:playerId|nomeGiocatore)/);
  assert.match(accountMigration, /where nonce = p_nonce\s+and used_at is null/);
  assert.match(accountMigration, /p_livello not between 1 and 3/);
  assert.match(accountMigration, /p_livello > coalesce\(v_record\.livello, 1\)/);
  assert.match(accountMigration, /p_metri > v_record\.metri/);
});

test("la fase identità non modifica scoring, deduplicazione o migrazioni Arcade", async () => {
  const [runner, leaderboard] = await Promise.all([
    read("src/app/gioca/FantaRunner.tsx"),
    read("src/lib/arcade/leaderboard.ts"),
  ]);

  assert.match(runner, /teamRating|recordCelebrationDistance/);
  assert.match(leaderboard, /deduplicateArcadeLeaderboard/);
  assert.match(leaderboard, /candidate\.identityKey/);
});
