import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getActiveSocietaById } from "@/lib/societa/catalog.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit/server";
import type { ArcadeLeaderboardEntry, ArcadeSaveResult } from "./types";
import { deduplicateArcadeLeaderboard, normalizeArcadeLevel, normalizeArcadePlayerName, normalizeArcadePlayerNameForLookup } from "./leaderboard";

const MINIMUM_METERS = 100;
const MAXIMUM_METERS = 2_147_483_647;
const MAXIMUM_RUN_AGE_MS = 30 * 60 * 1000;
const MAXIMUM_PLAUSIBLE_METERS_PER_SECOND = 12;
const DISTANCE_TOLERANCE_METERS = 60;

type ArcadeIdentity = { profileId: string; username: string; usernameNormalized: string };
type RunProofPayload = { profileId: string; societaId: number; livello: 1 | 2 | 3; issuedAt: number; nonce: string };

export async function getArcadeLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  try {
    return (await loadDeduplicatedLeaderboard()).slice(0, 100).map(toPublicEntry);
  } catch (error) {
    console.error("[arcade] Impossibile caricare la classifica", error);
    return [];
  }
}

export async function createArcadeRunProofForCurrentUser(societaId: number, livello: number) {
  const identity = await getAuthenticatedArcadeIdentity();
  if (!identity || !(await isValidTeam(societaId)) || !isValidLevel(livello)) return null;
  const issuedAt = Date.now();
  const nonce = randomBytes(24).toString("base64url");
  const payload: RunProofPayload = { profileId: identity.profileId, societaId, livello, issuedAt, nonce };
  const { error } = await getSupabaseAdminClient().from("arcade_run_tokens").insert({
    nonce,
    nome_giocatore_normalizzato: identity.usernameNormalized,
    societa_id: societaId,
    started_at: new Date(issuedAt).toISOString(),
    expires_at: new Date(issuedAt + MAXIMUM_RUN_AGE_MS).toISOString(),
    profile_id: identity.profileId,
  });
  if (error) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export async function saveArcadeRecord(input: { metri: number; proof: string }): Promise<ArcadeSaveResult> {
  const identity = await getAuthenticatedArcadeIdentity();
  if (!identity) return { ok: false, message: "Accedi al tuo Account Fanta a 20 per salvare il record." };
  const proofResult = verifyRunProof(input.proof);
  const metri = Math.trunc(Number(input.metri));
  if (!proofResult.ok) return proofResult.reason === "expired" ? expiredRun() : invalidRun();
  const payload = proofResult.payload;
  if (payload.profileId !== identity.profileId) return invalidRun();
  if (!(await isValidTeam(payload.societaId)) || !isValidLevel(payload.livello)) return invalidRun();

  try {
    const consumed = await consumeArcadeRunToken(payload);
    if (consumed.status === "expired") return expiredRun();
    if (consumed.status !== "consumed" || !consumed.startedAt) return invalidRun();
    if (!Number.isSafeInteger(metri) || metri < MINIMUM_METERS || metri > MAXIMUM_METERS) return invalidRun();
    const elapsedSeconds = Math.max(0, (Date.now() - new Date(consumed.startedAt).getTime()) / 1000);
    if (metri > elapsedSeconds * MAXIMUM_PLAUSIBLE_METERS_PER_SECOND + DISTANCE_TOLERANCE_METERS) return invalidRun();
    const allowed = await consumeRateLimit({ scope: "arcade_record", limit: 10, windowSeconds: 10 * 60 });
    if (!allowed) return { ok: false, message: "Hai effettuato troppi tentativi. Attendi qualche minuto." };

    const admin = getSupabaseAdminClient();
    const rpcResponse = await admin.rpc("salva_record_arcade_v4", {
      p_nonce: payload.nonce,
      p_profile_id: identity.profileId,
      p_societa_id: payload.societaId,
      p_livello: payload.livello,
      p_metri: metri,
    });
    if (rpcResponse.error) {
      console.error("[arcade] RPC salva_record_arcade_v4 non riuscita", rpcResponse.error);
      return serviceUnavailable();
    }
    const { data: savedRow, error: savedError } = await admin
      .from("classifica_arcade")
      .select("id,profile_id,metri")
      .eq("profile_id", identity.profileId)
      .maybeSingle();
    if (savedError || !savedRow) return serviceUnavailable();

    const completeLeaderboard = await loadDeduplicatedLeaderboard();
    const identityKey = `account:${identity.profileId}`;
    const positionIndex = completeLeaderboard.findIndex((entry) => entry.identityKey === identityKey);
    const position = positionIndex >= 0 ? positionIndex + 1 : completeLeaderboard.length + 1;
    return {
      ok: true,
      message: position <= 100 ? `POSIZIONE ${position}°` : "SEI FUORI DALLA TOP 100...\nRIPROVA!",
      metriRecord: extractRecordMeters(rpcResponse.data) ?? savedRow.metri,
      position,
      highlightedId: leaderboardEntryId(savedRow.id),
      leaderboard: completeLeaderboard.slice(0, 100).map(toPublicEntry),
    };
  } catch (error) {
    console.error("[arcade] Salvataggio o aggiornamento classifica non riuscito", error);
    return serviceUnavailable();
  }
}

async function getAuthenticatedArcadeIdentity(): Promise<ArcadeIdentity | null> {
  const authenticated = await createAuthenticatedSupabaseClient();
  const { data: { user }, error: userError } = await authenticated.auth.getUser();
  if (userError || !user) return null;
  const { data: profile, error: profileError } = await authenticated
    .from("profiles")
    .select("id,username,username_normalizzato")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.username || !profile.username_normalizzato || profile.id !== user.id) return null;
  return { profileId: user.id, username: profile.username, usernameNormalized: profile.username_normalizzato };
}

async function loadDeduplicatedLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("classifica_arcade")
    .select("id,profile_id,player_id,nome_giocatore,societa_id,livello,metri,created_at,updated_at")
    .order("livello", { ascending: false }).order("metri", { ascending: false }).order("updated_at", { ascending: true }).limit(1000);
  if (error) throw error;
  const profileIds = [...new Set((data ?? []).flatMap((row) => row.profile_id ? [row.profile_id] : []))];
  const profileNames = new Map<string, string>();
const officialSocietaByProfile = new Map<string, number | null>();

if (profileIds.length) {
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id,username,societa_id")
    .in("id", profileIds);

  if (profilesError) throw profilesError;

  for (const profile of profiles ?? []) {
    profileNames.set(profile.id, profile.username);
    officialSocietaByProfile.set(
      profile.id,
      profile.societa_id == null ? null : Number(profile.societa_id)
    );
  }
}
  const entries: ArcadeLeaderboardEntry[] = [];
  for (const row of data ?? []) {
    const displayName = normalizeArcadePlayerName((row.profile_id ? profileNames.get(row.profile_id) : null) ?? row.nome_giocatore);
    if (!displayName || !Number.isInteger(row.societa_id) || !Number.isFinite(row.metri)) continue;
    entries.push({
      id: leaderboardEntryId(row.id),
      profileId: row.profile_id ?? undefined,
officialSocietaId: row.profile_id
  ? officialSocietaByProfile.get(row.profile_id) ?? null
  : null,
      identityKey: row.profile_id ? `account:${row.profile_id}` : row.player_id ? `legacy-player:${row.player_id}` : `legacy-name:${normalizeArcadePlayerNameForLookup(displayName)}`,
      nomeGiocatore: displayName,
      societaId: row.societa_id,
      livello: normalizeArcadeLevel(row.livello),
      metri: row.metri,
      updatedAt: row.updated_at || row.created_at || "",
    });
  }
  return deduplicateArcadeLeaderboard(entries);
}

function toPublicEntry(entry: ArcadeLeaderboardEntry): ArcadeLeaderboardEntry {
  const publicEntry = { ...entry };
  delete publicEntry.identityKey;
  return publicEntry;
}
function leaderboardEntryId(id: string | number) { return `arcade-record:${String(id)}`; }

function verifyRunProof(proof: string): { ok: true; payload: RunProofPayload } | { ok: false; reason: "expired" | "invalid" } {
  try {
    const [encoded, signature] = String(proof).split(".");
    if (!encoded || !signature) return { ok: false, reason: "invalid" };
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: "invalid" };
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RunProofPayload;
    if (!payload.nonce || !isUuid(payload.profileId) || !Number.isFinite(payload.issuedAt)) return { ok: false, reason: "invalid" };
    if (Date.now() - payload.issuedAt > MAXIMUM_RUN_AGE_MS) return { ok: false, reason: "expired" };
    if (Date.now() - payload.issuedAt < 0) return { ok: false, reason: "invalid" };
    return { ok: true, payload };
  } catch { return { ok: false, reason: "invalid" }; }
}

async function consumeArcadeRunToken(payload: RunProofPayload) {
  const { data, error } = await getSupabaseAdminClient().rpc("consuma_arcade_run_token_v3", {
    p_nonce: payload.nonce, p_profile_id: payload.profileId, p_societa_id: payload.societaId,
  });
  if (error || !Array.isArray(data) || !data[0]) return { status: "invalid" as const, startedAt: null };
  return { status: String(data[0].stato) as "consumed" | "expired" | "invalid", startedAt: data[0].started_at ? String(data[0].started_at) : null };
}

function sign(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Configurazione server non disponibile.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}
function extractRecordMeters(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return null;
  const meters = Number((value as Record<string, unknown>).metri_record);
  return Number.isSafeInteger(meters) ? meters : null;
}
async function isValidTeam(value: number) {
  if (!Number.isInteger(value)) return false;
  try { return Boolean(await getActiveSocietaById(value)); } catch { return false; }
}
function isValidLevel(value: number): value is 1 | 2 | 3 { return value === 1 || value === 2 || value === 3; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function serviceUnavailable(): ArcadeSaveResult { return { ok: false, message: "La classifica non è momentaneamente disponibile. Riprova più tardi." }; }
function expiredRun(): ArcadeSaveResult { return { ok: false, message: "La sessione di gioco è scaduta. Avvia una nuova corsa." }; }
function invalidRun(): ArcadeSaveResult { return { ok: false, message: "Impossibile verificare questa partita. Avvia una nuova corsa." }; }
