import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSocieta } from "@/lib/societa";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit/server";
import type { ArcadeLeaderboardEntry, ArcadeSaveResult } from "./types";
import {
  deduplicateArcadeLeaderboard,
  compareArcadeLeaderboardEntries,
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
  nomeGiocatoreNormalizzato: string;
  societaId: number;
  livello: 1 | 2 | 3;
  issuedAt: number;
  nonce: string;
};

export async function getArcadeLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  try {
    return (await loadDeduplicatedLeaderboard()).slice(0, 100);
  } catch (error) {
    console.error("[arcade] Impossibile caricare la classifica", error);
    return [];
  }
}

export async function createArcadeRunProof(nomeGiocatore: string, societaId: number, livello: number) {
  const nomeGiocatoreNormalizzato = normalizeArcadePlayerNameForLookup(nomeGiocatore);
  if (nomeGiocatoreNormalizzato.length < 2 || nomeGiocatoreNormalizzato.length > 50 || !isValidTeam(societaId) || !isValidLevel(livello)) return null;
  const issuedAt = Date.now();
  const nonce = randomBytes(24).toString("base64url");
  const payload: RunProofPayload = {
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
  });
  if (error) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export async function saveArcadeRecord(input: {
  nomeGiocatore: string;
  metri: number;
  proof: string;
}): Promise<ArcadeSaveResult> {
  const nomeGiocatore = normalizeArcadePlayerName(input.nomeGiocatore);
  if (nomeGiocatore.length < 2 || nomeGiocatore.length > 50) {
    return { ok: false, message: "Inserisci un nome valido.", fieldError: "Il nome deve contenere da 2 a 50 caratteri." };
  }

  const proofResult = verifyRunProof(input.proof);
  const metri = Math.trunc(Number(input.metri));
  if (!proofResult.ok) return proofResult.reason === "expired" ? expiredRun() : invalidRun();
  const payload = proofResult.payload;
  const normalizedName = normalizeArcadePlayerNameForLookup(nomeGiocatore);
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
    const rpcResponse = await supabase.rpc("salva_record_arcade_v2", {
      p_nome_giocatore: nomeGiocatore,
      p_societa_id: payload.societaId,
      p_livello: payload.livello,
      p_metri: metri,
    });
    let data = rpcResponse.data;
    if (rpcResponse.error?.code === "PGRST202") {
      console.error("[arcade] RPC salva_record_arcade_v2 assente; uso fallback compatibile", {
        status: rpcResponse.status,
        statusText: rpcResponse.statusText,
        ...rpcResponse.error,
      });
      const fallback = await persistArcadeRecordCompat({
        nomeGiocatore,
        normalizedName,
        societaId: payload.societaId,
        livello: payload.livello,
        metri,
      });
      if (!fallback.ok) return serviceUnavailable();
      data = [{ metri_record: fallback.metriRecord }];
    } else if (rpcResponse.error) {
      console.error("[arcade] RPC salva_record_arcade_v2 non riuscita", {
        status: rpcResponse.status,
        statusText: rpcResponse.statusText,
        ...rpcResponse.error,
      });
      return serviceUnavailable();
    }

    const returnedRecord = extractRecordMeters(data);
    const { data: savedRow, error: savedError } = await supabase
      .from("classifica_arcade")
      .select("nome_giocatore,societa_id,metri,livello,updated_at")
      .eq("nome_giocatore_normalizzato", normalizedName)
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
      (entry) => normalizeArcadePlayerNameForLookup(entry.nomeGiocatore) === normalizedName
    );
    const position = positionIndex >= 0 ? positionIndex + 1 : completeLeaderboard.length + 1;
    const leaderboard = completeLeaderboard.slice(0, 100);
    const highlightedId = leaderboardEntryId(savedRow.nome_giocatore, savedRow.societa_id);

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
    .select("id,nome_giocatore,societa_id,livello,metri,created_at,updated_at")
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
      id: leaderboardEntryId(row.nome_giocatore, row.societa_id),
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

async function persistArcadeRecordCompat(input: {
  nomeGiocatore: string;
  normalizedName: string;
  societaId: number;
  livello: 1 | 2 | 3;
  metri: number;
}): Promise<{ ok: true; metriRecord: number } | { ok: false }> {
  const supabase = getSupabaseAdminClient();
  const existingResponse = await supabase
    .from("classifica_arcade")
    .select("id,nome_giocatore,societa_id,livello,metri,created_at,updated_at")
    .eq("nome_giocatore_normalizzato", input.normalizedName);
  if (existingResponse.error) {
    console.error("[arcade] Fallback: select del record personale non riuscita", existingResponse.error);
    return { ok: false };
  }

  const existing = (existingResponse.data ?? [])
    .filter((row) => Number.isInteger(row.societa_id) && Number.isFinite(row.metri))
    .map((row) => ({
      rowId: row.id,
      entry: {
        id: String(row.id),
        nomeGiocatore: normalizeArcadePlayerName(row.nome_giocatore),
        societaId: row.societa_id,
        livello: normalizeArcadeLevel(row.livello),
        metri: row.metri,
        updatedAt: row.updated_at || row.created_at || "",
      } satisfies ArcadeLeaderboardEntry,
    }))
    .sort((a, b) => compareArcadeLeaderboardEntries(a.entry, b.entry));
  const current = existing[0];
  const candidate: ArcadeLeaderboardEntry = {
    id: "candidate",
    nomeGiocatore: input.nomeGiocatore,
    societaId: input.societaId,
    livello: input.livello,
    metri: input.metri,
    updatedAt: new Date().toISOString(),
  };
  if (current && compareArcadeLeaderboardEntries(candidate, current.entry) >= 0) {
    return { ok: true, metriRecord: current.entry.metri };
  }

  const values = {
    nome_giocatore: input.nomeGiocatore,
    nome_giocatore_normalizzato: input.normalizedName,
    societa_id: input.societaId,
    livello: input.livello,
    metri: input.metri,
    updated_at: new Date().toISOString(),
  };
  const writeResponse = current
    ? await supabase.from("classifica_arcade").update(values).eq("id", current.rowId).select("metri").single()
    : await supabase.from("classifica_arcade").insert(values).select("metri").single();
  if (writeResponse.error || !writeResponse.data) {
    console.error("[arcade] Fallback: scrittura del record non riuscita", writeResponse.error);
    return { ok: false };
  }
  return { ok: true, metriRecord: writeResponse.data.metri };
}

function leaderboardEntryId(nome: string, societaId: number) {
  return `${normalizeArcadePlayerNameForLookup(nome)}:${societaId}`;
}

function verifyRunProof(proof: string): { ok: true; payload: RunProofPayload } | { ok: false; reason: "expired" | "invalid" } {
  try {
    const [encoded, signature] = String(proof).split(".");
    if (!encoded || !signature) return { ok: false, reason: "invalid" };
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: "invalid" };
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RunProofPayload;
    if (!payload.nonce || !payload.nomeGiocatoreNormalizzato || !Number.isFinite(payload.issuedAt)) return { ok: false, reason: "invalid" };
    if (Date.now() - payload.issuedAt > MAXIMUM_RUN_AGE_MS) return { ok: false, reason: "expired" };
    if (Date.now() - payload.issuedAt < 0) return { ok: false, reason: "invalid" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

async function consumeArcadeRunToken(payload: RunProofPayload, normalizedName: string) {
  const { data, error } = await getSupabaseAdminClient().rpc("consuma_arcade_run_token", {
    p_nonce: payload.nonce,
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

function serviceUnavailable(): ArcadeSaveResult {
  return { ok: false, message: "La classifica non è momentaneamente disponibile. Riprova più tardi." };
}

function expiredRun(): ArcadeSaveResult {
  return { ok: false, message: "La sessione di gioco è scaduta. Avvia una nuova corsa." };
}

function invalidRun(): ArcadeSaveResult {
  return { ok: false, message: "Impossibile verificare questa partita. Avvia una nuova corsa." };
}
