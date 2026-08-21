import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const baseMigration = read("supabase", "migrations", "202608210004_public_profile_competitive_positions.sql");
const migration = read("supabase", "migrations", "202608210005_extend_profile_arcade_position.sql");
const profile = read("src", "app", "user", "[username]", "page.tsx");

const arcadePositions = (rows) => rows
  .filter((row) => row.profileId !== null)
  .sort((a, b) => b.level - a.level || b.meters - a.meters || a.updated.localeCompare(b.updated) || a.created.localeCompare(b.created) || a.id - b.id)
  .map((row, index) => ({ ...row, position: index + 1 }));

test("migration 004 resta congelata nella firma già applicata", () => {
  const signature = baseMigration.match(/returns table \(([\s\S]*?)\)\s*language sql/i)?.[1] ?? "";
  assert.match(signature, /fantabet_position bigint/);
  assert.match(signature, /fantabet_points bigint/);
  assert.match(signature, /arcade_position bigint/);
  assert.doesNotMatch(signature, /arcade_level|arcade_meters/);
});

test("Arcade usa profile_id, ignora legacy e applica tutti gli spareggi ufficiali", () => {
  assert.match(migration, /where score\.profile_id is not null/i);
  assert.match(migration, /order by score\.livello desc, score\.metri desc,[\s\S]*score\.updated_at asc, score\.created_at asc, score\.id asc/i);
  assert.doesNotMatch(migration, /player_id|nome_giocatore|nickname/i);

  const rows = [
    { id: 1, profileId: null, level: 3, meters: 9999, updated: "2026-01-01", created: "2026-01-01" },
    ...Array.from({ length: 11 }, (_, index) => ({ id: index + 2, profileId: `p${index + 1}`, level: 2, meters: 1100 - index, updated: "2026-02-01", created: "2026-01-01" })),
  ];
  const ranked = arcadePositions(rows);
  assert.equal(ranked.find((row) => row.profileId === "p1")?.position, 1);
  assert.equal(ranked.find((row) => row.profileId === "p10")?.position, 10);
  assert.equal(ranked.find((row) => row.profileId === "p11")?.position, 11);
  assert.equal(ranked.some((row) => row.profileId === null), false);
  assert.equal(ranked.find((row) => row.profileId === "absent"), undefined);
});

test("Arcade restituisce e mostra livello e metri dello stesso record classificato", () => {
  assert.doesNotMatch(baseMigration, /arcade_level|arcade_meters/);
  assert.match(migration, /drop function if exists public\.public_profile_competitive_positions\(uuid\)/);
  assert.match(migration, /arcade_position bigint,[\s\S]*arcade_level smallint,[\s\S]*arcade_meters integer/);
  assert.match(migration, /select score\.profile_id, score\.livello, score\.metri/);
  assert.match(migration, /arcade\.posizione,[\s\S]*arcade\.livello, arcade\.metri/);
  assert.match(profile, /\{competitivePositions\.arcade_position\}° posto/);
  assert.match(profile, /L\{competitivePositions\.arcade_level\} · \{competitivePositions\.arcade_meters\} m/);

  const render = (position, level, meters) => position && level !== null && meters !== null
    ? [`${position}° posto`, `L${level} · ${meters} m`]
    : ["Non classificato"];
  assert.deepEqual(render(4, 1, 349), ["4° posto", "L1 · 349 m"]);
  assert.deepEqual(render(7, 2, 812), ["7° posto", "L2 · 812 m"]);
  assert.deepEqual(render(null, null, null), ["Non classificato"]);
});

test("FantaBet delega alla leaderboard pubblica realmente disponibile", () => {
  const fantabetCte = migration.slice(migration.indexOf("with fantabet as"), migration.indexOf("), arcade_ranked as"));
  assert.match(migration, /from public\.fantabet_global_leaderboard\(\) leaderboard/i);
  assert.match(migration, /where leaderboard\.profile_id = p_profile_id/i);
  assert.doesNotMatch(fantabetCte, /fantabet_predictions|fantabet_rounds|row_number\(/i);
  assert.match(migration, /left join fantabet on true/);
});

test("profilo proprio e pubblico condividono la stessa RPC mirata e i fallback", () => {
  assert.match(profile, /rpc\("public_profile_competitive_positions", \{ p_profile_id: profile\.id \}\)/);
  assert.match(profile, /competitivePositions\?\.fantabet_position/);
  assert.match(profile, /competitivePositions\?\.arcade_position/);
  assert.ok((profile.match(/Non classificato/g) ?? []).length >= 2);
  assert.doesNotMatch(profile, /rpc\("fantabet_global_leaderboard"\)/);
});

test("le card mantengono griglia e classi responsive esistenti", () => {
  assert.match(profile, /data-profile-stats className="grid grid-cols-2 gap-2 sm:gap-4"/);
  assert.match(profile, /StatCard title="FantaBet" accent="bg-orange-400"/);
  assert.match(profile, /StatCard title="Arcade" accent="bg-sky-500"/);
});
