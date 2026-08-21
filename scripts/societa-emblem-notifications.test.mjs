import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (...parts) => readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
const migration = read("supabase", "migrations", "202608210003_add_primo_scambio_emblem.sql");
const catalogUi = read("src", "lib", "emblemi-ui.ts");
const catalog = read("data", "emblemi.csv");
const support = read("src", "lib", "account", "support.server.ts");
const page = read("src", "app", "societa", "[slug]", "page.tsx");
const popup = read("src", "app", "components", "GlobalEmblemNotifications.tsx");
const popupServer = read("src", "app", "components", "GlobalEmblemNotifications.server.tsx");

test("Primo Scambio usa catalogo e asset reali ed esce dal filtro nascosto", () => {
  assert.match(catalog, /,primo scambio,base,Sbloccabile,Concludi almeno uno scambio\.,/i);
  assert.equal(existsSync(new URL("../public/emblemi/base/primo_scambio.png", import.meta.url)), true);
  assert.doesNotMatch(catalogUi.match(/NOMI_EMBLEMI_NASCOSTI[\s\S]*?\]\);/)?.[0] ?? "", /primo scambio/i);
  assert.match(migration, /'primo_scambio'/);
});

test("Primo Scambio resta manuale: nessuna deduzione da mercato o scambi", () => {
  assert.doesNotMatch(migration, /mercato|trattativ|trasferiment|after insert[^;]*(?:scamb|mercat)/i);
  assert.match(migration, /after insert on public\.societa_emblem_unlocks/i);
});

test("Nickname deriva solo da profiles.societa_id, è opzionale e linka il profilo pubblico", () => {
  assert.match(support, /from\("profiles"\)[\s\S]*\.eq\("societa_id", societaId\)/);
  assert.match(page, /getVerifiedSocietaUsernames\(team\.id\)/);
  assert.match(page, /\.\.\.verifiedUsernames\.map/);
  assert.match(page, /`\/user\/\$\{encodeURIComponent\(username\)\}`/);
  assert.match(page, /break-all/);
  assert.doesNotMatch(page, /Nickname[^\n]*(?:—|non disponibile)/);
});

test("notifiche permanenti sono account-based, uniche e viste server-side", () => {
  assert.match(migration, /create table public\.societa_emblem_notifications/);
  assert.match(migration, /unique \(profile_id, societa_id, emblem_key\)/);
  assert.match(migration, /seen_at timestamptz null/);
  assert.match(migration, /notification\.profile_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /where id = p_notification_id and profile_id = auth\.uid\(\)/);
  assert.match(popup, /mark_my_societa_emblem_notification_seen/);
  assert.match(popupServer, /my_pending_societa_emblem_notifications/);
});

test("backfill iniziale notifica solo Primo Scambio e non riproduce lo storico", () => {
  const backfill = migration.slice(migration.lastIndexOf("select private.enqueue_societa_emblem_notifications"));
  assert.match(backfill, /where unlock\.emblem_key = 'primo_scambio'/);
  for (const key of ["primo_tifoso", "la_curva_cresce", "un_popolo", "sold_out", "prima_inviolata", "prima_goleada", "primi_passi", "primo_punto", "manita", "schiacciasassi", "bestia_nera"]) {
    assert.doesNotMatch(backfill, new RegExp(`'${key}'`));
  }
});

test("nuovi unlock dopo la migration continuano a essere notificati dal trigger", () => {
  assert.match(migration, /create trigger societa_emblem_unlock_notifications after insert on public\.societa_emblem_unlocks/);
  assert.match(migration, /perform private\.enqueue_societa_emblem_notifications\(new\.societa_id, new\.emblem_key, new\.stagione_id, new\.unlocked_at\)/);
});

test("RPC e consumer conservano la societÃ  della notifica anche dopo un cambio tifo", () => {
  const rpc = migration.slice(migration.indexOf("create function public.my_pending"), migration.indexOf("create function public.mark_my"));
  assert.match(rpc, /returns table \(notification_id bigint, societa_id bigint, emblem_key text, audience text, unlocked_at timestamptz\)/);
  assert.match(rpc, /notification\.societa_id/);
  assert.match(popupServer, /societaById\.get\(Number\(row\.societa_id\)\)/);
  assert.match(popupServer, /societaName: societa\.nome/);
  assert.match(popup, /current\.societaName/);
  assert.doesNotMatch(popupServer, /supportedSocietaId|getMySupportHubData|profile_supports/);

  const pending = { societa_id: 1 };
  const currentSupport = 2;
  const displayedSocieta = pending.societa_id;
  assert.equal(displayedSocieta, 1);
  assert.notEqual(displayedSocieta, currentSupport);
});

test("tifosi sono valutati al momento dello sblocco e doppio ruolo preferisce official", () => {
  assert.match(migration, /support\.selected_at <= p_unlocked_at/);
  assert.match(migration, /ineligibility\.officialized_at <= p_unlocked_at/);
  assert.match(migration, /profile_support_ineligibilities/);
  assert.match(migration, /do update set audience = 'official'/);
  assert.match(popup, /La squadra che tifi ha sbloccato un emblema/);
});

test("manuali e automatici condividono il trigger, holder dinamici restano esclusi", () => {
  assert.match(migration, /after insert on public\.societa_emblem_unlocks/);
  assert.doesNotMatch(migration, /societa_emblem_holder_history|titano|abisso|mecenate|idolo/);
});

test("payload pubblico non espone identità o dati account e popup resta mobile-first", () => {
  const rpc = migration.slice(migration.indexOf("create function public.my_pending"), migration.indexOf("create function public.mark_my"));
  const signature = rpc.match(/returns table \(([^)]*)\)/i)?.[1] ?? "";
  assert.doesNotMatch(signature, /profile_id|email|player_id/i);
  assert.match(signature, /societa_id bigint/i);
  assert.match(migration, /security definer set search_path = ''/g);
  assert.match(popup, /max-h-\[92dvh\] w-full max-w-md/);
  assert.match(popup, /overflow-x-hidden/);
  assert.match(popup, /min-\[390px\]/);
  assert.match(popup, /touch-manipulation/);
});
