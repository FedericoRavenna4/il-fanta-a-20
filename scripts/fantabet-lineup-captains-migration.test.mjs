import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202608270002_fantabet_lineup_captains.sql", import.meta.url), "utf8");
const adminUi = await readFile(new URL("../src/app/admin/formazioni/LineupsAdminClient.tsx", import.meta.url), "utf8");
const publicUi = await readFile(new URL("../src/app/fantabet/FantaBetClient.tsx", import.meta.url), "utf8");

test("C e VC sono posizioni snapshot senza FK alla Rosa", () => { assert.match(sql, /captain_order smallint/); assert.match(sql, /vice_captain_order smallint/); assert.doesNotMatch(sql, /references public\.rose_giocatori/); });
test("DB richiede C e VC distinti e compresi negli undici", () => { assert.match(sql, /captain is null/); assert.match(sql, /vice_captain is null/); assert.match(sql, /captain=vice_captain/); assert.match(sql, /player_ids @> pg_catalog\.jsonb_build_array\(captain\)/); assert.match(sql, /player_ids @> pg_catalog\.jsonb_build_array\(vice_captain\)/); });
test("payload completo identico è no-op", () => { assert.match(sql, /existing\.captain_order is not distinct from v_captain_order/); assert.match(sql, /existing\.vice_captain_order is not distinct from v_vice_captain_order/); assert.match(sql, /then continue/); });
test("cambio solo C o VC aggiorna la lineup senza riscrivere i giocatori", () => { const branch = sql.slice(sql.indexOf("if coalesce(v_snapshot_unchanged,false)"), sql.indexOf("insert into public.fantabet_lineups as current")); assert.match(branch, /update public\.fantabet_lineups set modulo=.*captain_order=.*vice_captain_order=/); assert.doesNotMatch(branch, /delete from public\.fantabet_lineup_players/); });
test("read pubblico espone C e VC nello snapshot", () => { assert.match(sql, /'captain',coalesce\(entry\.ordine=lineup\.captain_order,false\)/); assert.match(sql, /'viceCaptain',coalesce\(entry\.ordine=lineup\.vice_captain_order,false\)/); assert.match(publicUi, /player\.captain \? " \(C\)"/); assert.match(publicUi, /player\.viceCaptain \? " \(V\)"/); });
test("Admin usa select mobile full width limitate ai titolari", () => { assert.match(adminUi, /Scegli tra gli 11 titolari/); assert.match(adminUi, /players=\{starters\}/); assert.match(adminUi, /min-h-12 w-full min-w-0/); assert.match(adminUi, /invalidateMissingLeaders/); });
