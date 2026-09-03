import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sql=await readFile(new URL("../supabase/migrations/202609030002_fantabet_lineup_admin_overrides.sql",import.meta.url),"utf8");
const ui=await readFile(new URL("../src/app/admin/formazioni/LineupsAdminClient.tsx",import.meta.url),"utf8");
const action=await readFile(new URL("../src/app/admin/formazioni/actions.ts",import.meta.url),"utf8");
const logic=await readFile(new URL("../src/lib/fantabet-lineups/logic.ts",import.meta.url),"utf8");

test("RPC distingue legacy e new e rifiuta ibridi",()=>{assert.match(sql,/then 'new'/);assert.match(sql,/then 'legacy'/);assert.match(sql,/FANTABET_LINEUPS_FORMATO_AMBIGUO/);assert.match(sql,/count\(distinct lineup\.payload_format\)/);});
test("legacy mantiene player_ids captain vice e vincolo rosa",()=>{assert.match(sql,/row\.player_ids/);assert.match(sql,/row\.captain/);assert.match(sql,/row\.vice_captain/);assert.match(sql,/roster\.societa_id = player\.societa_id/);});
test("nuovo payload supporta roster manual e conferma override",()=>{assert.match(sql,/source not in \('roster', 'manual'\)/);assert.match(sql,/raw_override_confirmed is distinct from 'true'::jsonb/);assert.match(sql,/or player\.raw_override_confirmed = 'true'::jsonb/);});
test("riferimenti roster sono limitati a stagione e lega",()=>{assert.match(sql,/roster\.stagione_id = p_stagione_id/);assert.match(sql,/league\.lega_codice = roster\.lega_codice/);assert.match(sql,/FANTABET_LINEUPS_LEGA_INVALIDA/);});
test("manuali hanno nome ruolo lunghezza e normalizzazione DB",()=>{assert.match(sql,/char_length\(pg_catalog\.btrim\(player\.manual_player\)\) not between 1 and 120/);assert.match(sql,/manual_role not in \('P', 'D', 'C', 'A'\)/);assert.match(sql,/normalize_fantabet_player_name/);});
test("duplicati risolti sono bloccati per nome normalizzato",()=>assert.match(sql,/group by player\.societa_id, player\.giocatore_normalizzato[\s\S]*having count\(\*\) > 1/));
test("22 slot due formazioni C e VC ordine sono validati",()=>{assert.match(sql,/count\(\*\) from incoming_players\) <> 22/);assert.match(sql,/jsonb_array_length\(lineup\.players\) <> 11/);assert.match(sql,/captain_order not between 1 and 11/);assert.match(sql,/captain_order = lineup\.vice_captain_order/);});
test("RPC resta privata service role security definer e search path vuoto",()=>{assert.match(sql,/security definer/);assert.match(sql,/set search_path = ''/);assert.match(sql,/revoke all on function public\.admin_upsert_fantabet_lineups[\s\S]*public, anon, authenticated/);assert.match(sql,/grant execute[\s\S]*to service_role/);});
test("salvataggio resta atomico no-op e snapshot senza FK rosa",()=>{assert.match(sql,/^begin;/);assert.match(sql,/commit;\s*$/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/v_snapshot_unchanged/);assert.doesNotMatch(sql,/references public\.rose_giocatori/);});
test("Admin usa solo payload nuovo e offre i tre percorsi",()=>{assert.doesNotMatch(action,/player_ids|vice_captain:/);assert.match(action,/roster_player_id/);assert.match(action,/captain_order/);for(const label of ["Giocatore della rosa","Cerca fuori rosa","Inserisci giocatore manuale","FUORI ROSA — CONFERMA MANUALE","GIOCATORE MANUALE — NON PRESENTE NELLE ROSE"])assert.match(ui,new RegExp(label));});
test("matching automatico non usa il catalogo globale",()=>{assert.match(logic,/matchPlayer\(n,option\.roster\)/);const body=logic.slice(logic.indexOf("buildLineupPreview"),logic.indexOf("export function sanitizeFormation"));assert.doesNotMatch(body,/leaguePlayers/);});
