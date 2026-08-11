import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("data layer reale FantaBet usa il catalogo Supabase condiviso per identità", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /getActiveSocietaCatalog\(\)/);
  assert.match(source, /new Map\(currentSocieta\.map\(\(team\) => \[team\.id, team\]\)\)/);
  assert.match(source, /name: team\.nome/);
  assert.match(source, /logo: team\.logo_path/);
  assert.match(source, /slug: team\.slug/);
  assert.match(source, /category: team\.categoria/);
  assert.match(source, /group: team\.girone/);
  assert.doesNotMatch(source, /getSocieta|societa\.csv|nome_personalizzato \?\?|slugify/);
});

test("giocate, round e rose restano collegate esclusivamente tramite ID", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /resolveTeam\(match\.societa_casa_id\)/);
  assert.match(source, /resolveTeam\(match\.societa_trasferta_id\)/);
  assert.match(source, /player\.squadraId === home\.id/);
  assert.match(source, /player\.squadraId === away\.id/);
  assert.match(source, /fantabet_bets/);
  assert.match(source, /fantabet_predictions/);
  assert.match(source, /fantabet_round_submissions/);
  assert.doesNotMatch(source, /team\.nome\s*===|\.find\([^\n]*nome/);
});

test("rinomina cambia solo la presentazione e non gli ID competitivi", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /const team = catalog\.get\(id\)/);
  assert.match(source, /id: team\.id, name: team\.nome/);
  assert.match(source, /homeStats: \{ \.\.\.recentTeamStats\(editionMatches, home\.id\)/);
  assert.match(source, /awayStats: \{ \.\.\.recentTeamStats\(editionMatches, away\.id\)/);
});

test("società mancante conserva bet e usa identità neutra", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /name: "Società non disponibile"/);
  assert.match(source, /logo: "\/logos\/logo\.png"/);
  assert.match(source, /slug: ""/);
  assert.doesNotMatch(source, /if \(!home \|\| !away\) return \[\]/);
});

test("leaderboard conserva righe e punti e arricchisce solo nome e logo", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /return \{ \.\.\.row, societa_id: officialId/);
  assert.match(source, /team_name: team\?\.nome \?\? null/);
  assert.match(source, /team_logo: team\?\.logo_path \?\? null/);
  assert.match(source, /leaderboardRaw\.map\(decorateLeaderboardRow\)/);
  assert.match(source, /roundLeaderboardRaw\.map\(decorateLeaderboardRow\)/);
});

test("demo FantaBet resta isolata e immutata dal loader reale", async () => {
  const [server, demo] = await Promise.all([
    read("src/lib/fantabet/server.ts"),
    read("src/lib/fantabet/demo.ts"),
  ]);

  assert.doesNotMatch(server, /from "\.\/demo"|from '\.\/demo'/);
  assert.match(demo, /const teams: FantaBetTeam\[\] = teamNames\.map/);
  assert.match(demo, /slug: `demo-\$\{index\}`/);
});

test("scoring, submission e streak non vengono ridefiniti dal data layer", async () => {
  const source = await read("src/lib/fantabet/server.ts");

  assert.match(source, /scorePlay\(bet\.type, bet\.points/);
  assert.doesNotMatch(source, /punti_bonus_costanza\s*=|streak_attuale\s*=|schedine_perfette\s*=/);
  assert.doesNotMatch(source, /insert\([^)]*fantabet_round_submissions|delete\([^)]*fantabet_round_submissions/);
});
