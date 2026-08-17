import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("Arcade richiede la sessione e non accetta identità dal client", async () => {
  const [actions, server] = await Promise.all([
    read("../../app/gioca/actions.ts"),
    read("./server.ts"),
  ]);
  assert.match(server, /auth\.getUser\(\)/);
  assert.match(server, /if \(!identity\).*Accedi al tuo Account Fanta a 20/s);
  assert.doesNotMatch(actions, /playerId|nomeGiocatore|nickname/i);
  assert.doesNotMatch(server, /input\.(?:playerId|profileId|nomeGiocatore|nickname)/);
  assert.match(server, /payload\.profileId !== identity\.profileId/);
});

test("username account è presentazionale e il cambio conserva profile_id", async () => {
  const [page, selector, server, migration] = await Promise.all([
    read("../../app/gioca/page.tsx"),
    read("../../app/gioca/TeamSelector.tsx"),
    read("./server.ts"),
    read("../../../supabase/migrations/202608170001_arcade_account_identity.sql"),
  ]);
  assert.match(page, /accountUsername=\{account\?\.username \?\? null\}/);
  assert.match(selector, /\{accountUsername\}/);
  assert.doesNotMatch(selector, /Inserisci il tuo nome|Modifica nickname|verifyArcadeNickname|getOrCreatePlayerId/);
  assert.match(server, /from\("profiles"\)[\s\S]*select\("id,username"\)/);
  assert.match(migration, /unique index[\s\S]*classifica_arcade_profile_id_uidx/);
  assert.match(migration, /where profile_id = p_profile_id/);
});

test("miglior record mantiene ordinamento livelli 1-3 e metri", async () => {
  const migration = await read("../../../supabase/migrations/202608170001_arcade_account_identity.sql");
  assert.match(migration, /p_livello not between 1 and 3/);
  assert.match(migration, /p_livello > coalesce\(v_record\.livello, 1\)/);
  assert.match(migration, /p_livello = coalesce\(v_record\.livello, 1\) and p_metri > v_record\.metri/);
});

test("leaderboard non serializza profile_id o Player ID", async () => {
  const server = await read("./server.ts");
  assert.match(server, /map\(toPublicEntry\)/);
  assert.match(server, /delete publicEntry\.identityKey/);
  assert.doesNotMatch(server, /playerId:/);
});
