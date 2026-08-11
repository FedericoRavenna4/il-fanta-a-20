import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const account = read("src", "app", "account", "page.tsx");
const profile = read("src", "app", "user", "[username]", "page.tsx");
const catalog = read("src", "lib", "societa", "catalog.server.ts");

test("Account risolve la società ufficiale per ID tramite loader Supabase", () => {
  assert.match(account, /getActiveSocietaById\(profile\.societa_id\)/);
  assert.match(account, /officialSocieta\?\.nome/);
  assert.match(account, /officialSocieta\.logo_path/);
  assert.match(account, /officialSocieta\.slug/);
  assert.match(account, /officialSocieta\?\.categoria/);
  assert.match(account, /officialSocieta\?\.girone/);
  assert.doesNotMatch(account, /getSocieta|societa\.csv|localSocieta|nome_ufficiale,categoria,girone/);
});

test("Account gestisce società inattiva o non trovata senza fallback", () => {
  assert.match(account, /Società collegata non disponibile/);
  assert.match(catalog, /getActiveSocietaById[\s\S]*\.eq\("attiva", true\)/);
});

test("profilo pubblico usa il catalogo Supabase per identità e selezione", () => {
  assert.match(profile, /getActiveSocietaCatalog\(\)/);
  assert.match(profile, /team\.nome/);
  assert.match(profile, /team\.logo_path/);
  assert.match(profile, /team\.slug/);
  assert.match(profile, /team\.categoria/);
  assert.match(profile, /team\.girone/);
  assert.doesNotMatch(profile, /\bgetSocieta\(|societa\.csv|team\.logo\b|team\.legaAttuale|team\.stagioneIngresso/);
});

test("società ufficiale ha priorità sul supporto stagionale", () => {
  assert.match(profile, /const officialTeam = profile\.societa_id \?/);
  assert.match(profile, /const supportedTeam = profile\.societa_id === null && support \?/);
  assert.match(profile, /const myTeam = officialTeam \?\? supportedTeam/);
});

test("catalogo tifo usa storia_tifo senza ripiegare sulla storia completa", () => {
  assert.match(profile, /story: team\.storia_tifo\?\.trim\(\) \?\? ""/);
  assert.doesNotMatch(profile, /story: team\.storia\b/);
  assert.match(catalog, /storia,storia_tifo/);
  assert.match(profile, /name: team\.nome/);
  assert.match(profile, /logo: team\.logo_path/);
  assert.match(profile, /category: team\.categoria/);
  assert.match(profile, /group: team\.girone/);
  assert.doesNotMatch(profile, /getSupportTeamTeasers|supportTeasers|storie_societa\.csv/);
});

test("profilo distingue verifica ufficiale e sostegno senza consentire autoassegnazioni", () => {
  const onboarding = read("src", "app", "user", "[username]", "ProfileOnboarding.tsx");
  const globalOnboarding = read("src", "app", "components", "GlobalProfileOnboarding.tsx");
  assert.match(globalOnboarding, /ProfileOnboarding/);
  assert.match(onboarding, /Sei .* tra le 100 societ.* Fanta a 20\?/);
  assert.match(onboarding, /verifica il profilo/i);
  assert.match(profile, /profile\.societa_id === null/);
  assert.doesNotMatch(profile, /update\([^)]*societa_id|profiles[^\n]*\.update/i);
});

test("banner profilo mantiene altezza fissa con o senza azioni owner", () => {
  const css = read("src", "app", "globals.css");
  assert.match(css, /\[data-profile-header\]\s*\{\s*height: 13rem/);
  assert.match(css, /@media \(min-width: 640px\)[\s\S]*\[data-profile-header\][\s\S]*height: 13\.5rem/);
});

test("ranking e trofei catalogo restano legacy ma uniti per ID", () => {
  assert.match(profile, /new Map\(getRanking\(\)\.map\(\(item\) => \[item\.squadraId, item\.posizione\]\)\)/);
  assert.match(profile, /rankingById\.get\(team\.id\)/);
  assert.match(profile, /trophyCounts\.get\(team\.id\)/);
  assert.doesNotMatch(profile, /nomeRanking|nomeSquadra|team\.nome\s*===/);
});

test("emblemi restano legacy per ID ma usano il badge corrente Supabase", () => {
  assert.match(profile, /newEntryIds = new Set\(allTeams\.filter\(\(team\) => team\.badge_tipo === "new_entry"\)/);
  assert.match(profile, /getEmblemiSocieta\(newEntryIds\)/);
  assert.match(profile, /team\.squadraId/);
});

test("consumer profilo non introducono cache di processo", () => {
  assert.match(catalog, /unstable_noStore as noStore/);
  assert.match(catalog, /noStore\(\)/);
  assert.doesNotMatch(account + profile, /cachedSocieta|unstable_cache|generateStaticParams/);
});
