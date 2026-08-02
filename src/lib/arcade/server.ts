import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSocieta } from "@/lib/societa";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit/server";
import type { ArcadeLeaderboardEntry, ArcadeNicknameClaimResult, ArcadeSaveResult } from "./types";
import {
  deduplicateArcadeLeaderboard,
  normalizeArcadeLevel,
  normalizeArcadePlayerName,
  normalizeArcadePlayerNameForLookup,
} from "./leaderboard";

const MINIMUM_METERS = 100;
const MAXIMUM_METERS = 2_147_483_647;
const MAXIMUM_RUN_AGE_MS = 30 * 60 * 1000;
const MAXIMUM_PLAUSIBLE_METERS_PER_SECOND = 12;
const DISTANCE_TOLERANCE_METERS = 60;

type RunProofPayload = {
  playerId: string;
  nomeGiocatoreNormalizzato: string;
  societaId: number;
  livello: 1 | 2 | 3;
  issuedAt: number;
  nonce: string;
};

export async function claimArcadeNickname(playerId: string, nickname: string): Promise<ArcadeNicknameClaimResult> {
  const displayName = normalizeArcadePlayerName(nickname);
  const normalizedName = normalizeArcadePlayerNameForLookup(displayName);
  if (!isValidPlayerId(playerId) || displayName.length < 2 || displayName.length > 30 || /[<>\u0000-\u001f\u007f]/.test(displayName)) {
    return { ok: false, status: "invalid", message: "Inserisci un nome valido." };
  }
  try {
    const { data, error } = await getSupabaseAdminClient().rpc("assegna_nickname_arcade", {
      p_player_id: playerId,
      p_nickname: displayName,
      p_nickname_normalized: normalizedName,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      console.error("[arcade] Verifica nickname non riuscita", error);
      return { ok: false, status: "unavailable", message: "Impossibile verificare il nickname. Riprova." };
    }
    const status = String(data[0].status);
    if (data[0].accepted === true && status === "assigned") return { ok: true, status: "assigned" };
    if (status === "nickname_taken") {
      return { ok: false, status: "nickname_taken", message: "Nickname già utilizzato. Scegline un altro." };
    }
    return { ok: false, status: "invalid", message: "Inserisci un nome valido." };
  } catch (error) {
    console.error("[arcade] Verifica nickname non disponibile", error);
    return { ok: false, status: "unavailable", message: "Impossibile verificare il nickname. Riprova." };
  }
}

export async function getArcadeLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  try {
    return (await loadDeduplicatedLeaderboard()).slice(0, 100);
  } catch (error) {
    console.error("[arcade] Impossibile caricare la classifica", error);
    return [];
  }
}

export async function createArcadeRunProof(playerId: string, nomeGiocatore: string, societaId: number, livello: number) {
  const nomeGiocatoreNormalizzato = normalizeArcadePlayerNameForLookup(nomeGiocatore);
  if (!isValidPlayerId(playerId) || nomeGiocatoreNormalizzato.length < 2 || nomeGiocatoreNormalizzato.length > 30 || !isValidTeam(societaId) || !isValidLevel(livello)) return null;
  const { data: identity, error: identityError } = await getSupabaseAdminClient()
    .from("arcade_players")
    .select("player_id")
    .eq("player_id", playerId)
    .eq("nickname_normalized", nomeGiocatoreNormalizzato)
    .maybeSingle();
  if (identityError || !identity) return null;
  const issuedAt = Date.now();
  const nonce = randomBytes(24).toString("base64url");
  const payload: RunProofPayload = {
    playerId,
    nomeGiocatoreNormalizzato,
    societaId,
    livello,
    issuedAt,
    nonce,
  };
  const { error } = await getSupabaseAdminClient().from("arcade_run_tokens").insert({
    nonce,
    nome_giocatore_normalizzato: nomeGiocatoreNormalizzato,
    societa_id: societaId,
    started_at: new Date(issuedAt).toISOString(),
    expires_at: new Date(issuedAt + MAXIMUM_RUN_AGE_MS).toISOString(),
    player_id: playerId,
  });
  if (error) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export async function saveArcadeRecord(input: {
  playerId: string;
  nomeGiocatore: string;
  metri: number;
  proof: string;
}): Promise<ArcadeSaveResult> {
  const nomeGiocatore = normalizeArcadePlayerName(input.nomeGiocatore);
  if (!isValidPlayerId(input.playerId) || nomeGiocatore.length < 2 || nomeGiocatore.length > 30) {
    return { ok: false, message: "Inserisci un nome valido.", fieldError: "Il nome deve contenere da 2 a 50 caratteri." };
  }

  const proofResult = verifyRunProof(input.proof);
  const metri = Math.trunc(Number(input.metri));
  if (!proofResult.ok) return proofResult.reason === "expired" ? expiredRun() : invalidRun();
  const payload = proofResult.payload;
  const normalizedName = normalizeArcadePlayerNameForLookup(nomeGiocatore);
  if (payload.playerId !== input.playerId || payload.nomeGiocatoreNormalizzato !== normalizedName) return invalidRun();
  if (!isValidTeam(payload.societaId) || !isValidLevel(payload.livello)) return invalidRun();
  try {
    const consumed = await consumeArcadeRunToken(payload, normalizedName);
    if (consumed.status === "expired") return expiredRun();
    if (consumed.status !== "consumed" || !consumed.startedAt) return invalidRun();

    if (!Number.isSafeInteger(metri) || metri < MINIMUM_METERS || metri > MAXIMUM_METERS) return invalidRun();
    const elapsedSeconds = Math.max(0, (Date.now() - new Date(consumed.startedAt).getTime()) / 1000);
    if (metri > elapsedSeconds * MAXIMUM_PLAUSIBLE_METERS_PER_SECOND + DISTANCE_TOLERANCE_METERS) return invalidRun();

    const allowed = await consumeRateLimit({
      scope: "arcade_record",
      limit: 10,
      windowSeconds: 10 * 60,
    });
    if (!allowed) {
      return { ok: false, message: "Hai effettuato troppi tentativi. Attendi qualche minuto." };
    }

    const supabase = getSupabaseAdminClient();
    const rpcResponse = await supabase.rpc("salva_record_arcade_v3", {
      p_nonce: payload.nonce,
      p_player_id: payload.playerId,
      p_nome_giocatore: nomeGiocatore,
      p_societa_id: payload.societaId,
      p_livello: payload.livello,
      p_metri: metri,
    });
    const data = rpcResponse.data;
    if (rpcResponse.error) {
      console.error("[arcade] RPC salva_record_arcade_v3 non riuscita", {
        status: rpcResponse.status,
        statusText: rpcResponse.statusText,
        ...rpcResponse.error,
      });
      return serviceUnavailable();
    }

    const returnedRecord = extractRecordMeters(data);
    const { data: savedRow, error: savedError } = await supabase
      .from("classifica_arcade")
      .select("player_id,nome_giocatore,societa_id,metri,livello,updated_at")
      .eq("player_id", payload.playerId)
      .order("livello", { ascending: false })
      .order("metri", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (savedError || !savedRow) {
      console.error("[arcade] Record salvato non rileggibile", savedError);
      return serviceUnavailable();
    }

    const metriRecord = returnedRecord ?? savedRow.metri;
    const completeLeaderboard = await loadDeduplicatedLeaderboard();
    const positionIndex = completeLeaderboard.findIndex(
      (entry) => entry.playerId === payload.playerId
    );
    const position = positionIndex >= 0 ? positionIndex + 1 : completeLeaderboard.length + 1;
    const leaderboard = completeLeaderboard.slice(0, 100);
    const highlightedId = leaderboardEntryId(savedRow.player_id, savedRow.nome_giocatore, savedRow.societa_id);

    return {
      ok: true,
      message: position <= 100
        ? `POSIZIONE ${position}°`
        : "SEI FUORI DALLA TOP 100...\nRIPROVA!",
      metriRecord,
      position,
      highlightedId,
      leaderboard,
    };
  } catch (error) {
    console.error("[arcade] Salvataggio o aggiornamento classifica non riuscito", error);
    return serviceUnavailable();
  }
}

async function loadDeduplicatedLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("classifica_arcade")
    .select("id,player_id,nome_giocatore,societa_id,livello,metri,created_at,updated_at")
    .order("livello", { ascending: false })
    .order("metri", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(1000);
  if (error) throw error;

  const entries: ArcadeLeaderboardEntry[] = [];
  for (const row of data ?? []) {
    const normalizedName = normalizeArcadePlayerNameForLookup(row.nome_giocatore);
    if (
      !normalizedName ||
      !Number.isInteger(row.societa_id) ||
      !Number.isFinite(row.metri)
    ) {
      console.warn("[arcade] Record incompleto ignorato nella classifica", {
        id: row.id,
        societaId: row.societa_id,
        livello: row.livello,
        metri: row.metri,
      });
      continue;
    }
    const candidate: ArcadeLeaderboardEntry = {
      id: leaderboardEntryId(row.player_id, row.nome_giocatore, row.societa_id),
      playerId: row.player_id,
      nomeGiocatore: normalizeArcadePlayerName(row.nome_giocatore),
      societaId: row.societa_id,
      livello: normalizeArcadeLevel(row.livello),
      metri: row.metri,
      updatedAt: row.updated_at || row.created_at || "",
    };
    entries.push(candidate);
  }

  return deduplicateArcadeLeaderboard(entries);
}

function leaderboardEntryId(playerId: string | null, nome: string, societaId: number) {
  return playerId ?? `legacy:${normalizeArcadePlayerNameForLookup(nome)}:${societaId}`;
}

function verifyRunProof(proof: string): { ok: true; payload: RunProofPayload } | { ok: false; reason: "expired" | "invalid" } {
  try {
    const [encoded, signature] = String(proof).split(".");
    if (!encoded || !signature) return { ok: false, reason: "invalid" };
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: "invalid" };
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RunProofPayload;
    if (!payload.nonce || !isValidPlayerId(payload.playerId) || !payload.nomeGiocatoreNormalizzato || !Number.isFinite(payload.issuedAt)) return { ok: false, reason: "invalid" };
    if (Date.now() - payload.issuedAt > MAXIMUM_RUN_AGE_MS) return { ok: false, reason: "expired" };
    if (Date.now() - payload.issuedAt < 0) return { ok: false, reason: "invalid" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

async function consumeArcadeRunToken(payload: RunProofPayload, normalizedName: string) {
  const { data, error } = await getSupabaseAdminClient().rpc("consuma_arcade_run_token_v2", {
    p_nonce: payload.nonce,
    p_player_id: payload.playerId,
    p_nome_giocatore_normalizzato: normalizedName,
    p_societa_id: payload.societaId,
  });
  if (error || !Array.isArray(data) || !data[0]) return { status: "invalid" as const, startedAt: null };
  return {
    status: String(data[0].stato) as "consumed" | "expired" | "invalid",
    startedAt: data[0].started_at ? String(data[0].started_at) : null,
  };
}

function sign(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Configurazione server non disponibile.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function extractRecordMeters(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return null;
  const metriRecord = Number((value as Record<string, unknown>).metri_record);
  return Number.isSafeInteger(metriRecord) ? metriRecord : null;
}

function isValidTeam(value: number) {
  return Number.isInteger(value) && getSocieta().some((team) => team.id === value);
}

function isValidLevel(value: number): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function isValidPlayerId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function serviceUnavailable(): ArcadeSaveResult {
  return { ok: false, message: "La classifica non è momentaneamente disponibile. Riprova più tardi." };
}

function expiredRun(): ArcadeSaveResult {
  return { ok: false, message: "La sessione di gioco è scaduta. Avvia una nuova corsa." };
}

function invalidRun(): ArcadeSaveResult {
  return { ok: false, message: "Impossibile verificare questa partita. Avvia una nuova corsa." };
}
