import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const page = read("src", "app", "societa", "[slug]", "page.tsx");
const catalog = read("src", "lib", "societa", "catalog.server.ts");
const current = read("src", "lib", "societa", "current.server.ts");
const supporters = read("src", "app", "societa", "[slug]", "TifosiSocieta.tsx");
const supportServer = read("src", "lib", "account", "support.server.ts");
const supporterMigration = read("supabase", "migrations", "202608210002_public_active_supporters.sql");

test("slug canonico usa la società Supabase e alias effettua redirect permanente", () => {
  assert.match(page, /const lookup = await getActiveSocietaBySlug\(slug\)/);
  assert.match(page, /if \(lookup\.isAlias\) permanentRedirect\(`\/societa\/\$\{lookup\.canonicalSlug\}`\)/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: false/);
  assert.match(catalog, /canonicalSlug: societa\.slug, isAlias: true/);
});

test("slug sconosciuto o società inattiva produce 404 senza fallback CSV", () => {
  assert.match(page, /if \(!lookup\) notFound\(\)/);
  assert.match(catalog, /\.eq\("attiva", true\)/);
  assert.match(catalog, /if \(!alias\.data\) return null/);
  assert.doesNotMatch(
  page,
  /getSocieta(?!SupportEmblems|DefendingEmblems)|societa\.csv|cachedSocieta/
);
});

test("nome corrente resta centralizzato e non viene ricostruito dalla pagina", () => {
  assert.match(current, /return row\.nome_personalizzato \?\? row\.nome_ufficiale/);
  assert.match(page, /title: team\.nome/);
  assert.match(page, /\{team\.nome\}/);
  assert.doesNotMatch(page, /nome_personalizzato\s*\?\?|coalesce|normalize.*nome/i);
});

test("fantallenatore storia logo categoria e girone arrivano dal record Supabase", () => {
  assert.match(page, /team\.fantallenatore/);
  assert.match(page, /team\.storia/);
  assert.match(page, /src=\{team\.logo_path \?\? "\/logos\/logo\.png"\}/);
  assert.match(page, /team\.categoria/);
  assert.match(page, /team\.girone/);
  assert.match(page, /team\.stagione_ingresso/);
  assert.match(page, /team\.badge_tipo/);
  assert.doesNotMatch(page, /getStorieSocieta|storiaEditoriale|\.logo\b|\.legaAttuale|\.stagioneIngresso|\.badgeNewEntry/);
});

test("ranking trofei risultati rose ed emblemi legacy si uniscono soltanto per ID", () => {
  assert.match(page, /ranking\.find\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /palmares\.find\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /loadRoseForSocieta\(team\.id\)/);
  assert.doesNotMatch(page, /getRose\(\)|rose\.filter\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /risultati\.filter\(\(item\) => item\.squadraId === team\.id\)/);
  assert.match(page, /emblemi\.find\([\s\S]*item\.squadraId === team\.id/);
  assert.doesNotMatch(page, /nomeSquadra\s*===|nomeRanking\s*===|\.find\([^)]*team\.nome/);
});

test("pagina dinamica eredita no-store e non genera slug dal CSV", () => {
  assert.match(catalog, /unstable_noStore as noStore/);
  assert.match(catalog, /noStore\(\)/);
  assert.doesNotMatch(page, /generateStaticParams|unstable_cache|cachedSocieta|data\/societa\.csv/);
});

test("metadata usa identità e URL canonici Supabase", () => {
  assert.match(page, /generateMetadata[\s\S]*getActiveSocietaBySlug\(slug\)/);
  assert.match(page, /path: `\/societa\/\$\{team\.slug\}`/);
});

test("scheda società sostituisce Gioca con il conteggio Tifosi stagionale autorevole", () => {
  assert.match(page, /getActiveSupporters\(team\.id\)/);
  assert.match(page, /const supporterCount = supporters\.length/);
  assert.match(page, /<TifosiSocieta supporters=\{supporters\} \/>/);
  assert.doesNotMatch(page, /Scendi in campo|\/gioca\?societa=/);
  assert.match(supportServer, /rpc\("active_supporters", \{ p_societa_id: societaId \}\)/);
});

test("popup Tifosi è responsive, accessibile e non espone dati privati", () => {
  assert.match(supporters, /role="dialog" aria-modal="true"/);
  assert.match(supporters, />I tifosi<\/h2>/i);
  assert.match(supporters, /Chiudi elenco tifosi/);
  assert.match(supporters, /Nessun tifoso al momento\./);
  assert.match(supporters, /`\/user\/\$\{encodeURIComponent\(supporter\.username\)\}`/);
  assert.match(supporters, /ProfileAvatar username=\{supporter\.username\} avatarUrl=\{supporter\.avatarUrl\}/);
  assert.match(supporters, /overflow-y-auto overflow-x-hidden/);
  assert.doesNotMatch(supporters, /Elenco dei tifosi non ancora disponibile/);
  assert.doesNotMatch(supporters, /email|nome_cognome|auth\.users|service.role/i);
});

test("RPC elenco e conteggio condividono lo stesso insieme autorevole", () => {
  assert.match(supporterMigration, /create function private\.active_supporter_profiles\(\)/i);
  assert.match(supporterMigration, /from private\.active_supporter_profiles\(\) supporter[\s\S]*group by supporter\.societa_id/i);
  assert.match(supporterMigration, /create function public\.active_supporters\(p_societa_id bigint\)[\s\S]*from private\.active_supporter_profiles\(\) supporter/i);
  for (const predicate of ["season.attiva = true", "profile.societa_id is null", "profile_support_ineligibilities"]) assert.ok(supporterMigration.includes(predicate));
});

test("conteggio 3 produce lista 3 e uno spostamento A-B aggiorna entrambi senza duplicati", () => {
  const active = (rows, team) => [...new Map(rows.filter((row) => row.team === team && row.eligible && row.profileExists).map((row) => [row.username, row])).values()];
  const before = [
    { username: "uno", team: "A", eligible: true, profileExists: true },
    { username: "due", team: "A", eligible: true, profileExists: true },
    { username: "tre", team: "A", eligible: true, profileExists: true },
  ];
  assert.equal(active(before, "A").length, 3);
  const after = before.map((row) => row.username === "tre" ? { ...row, team: "B" } : row);
  assert.equal(active(after, "A").length, 2);
  assert.deepEqual(active(after, "B").map((row) => row.username), ["tre"]);
  assert.equal(active(after.map((row) => row.username === "due" ? { ...row, eligible: false } : row), "A").length, 1);
  assert.equal(active(after.map((row) => row.username === "uno" ? { ...row, profileExists: false } : row), "A").length, 1);
  assert.equal(active([], "A").length, 0);
});

test("RPC pubblica espone solo username e metadati avatar pubblici", () => {
  const publicSignature = supporterMigration.match(/create function public\.active_supporters[\s\S]*?language sql/i)?.[0] ?? "";
  assert.match(publicSignature, /username text,[\s\S]*avatar_url text,[\s\S]*avatar_updated_at timestamptz/i);
  assert.doesNotMatch(publicSignature, /profile_id|email|player_id|auth\.users/i);
  assert.match(supporterMigration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(supporterMigration, /grant execute on function public\.active_supporters\(bigint\)[\s\S]*to anon, authenticated, service_role/i);
});
