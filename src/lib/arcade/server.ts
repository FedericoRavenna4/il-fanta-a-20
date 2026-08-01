import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSocieta } from "@/lib/societa";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ArcadeLeaderboardEntry, ArcadeSaveResult } from "./types";

const MINIMUM_METERS = 100;
const MAXIMUM_METERS = 2_147_483_647;
const MAXIMUM_RUN_AGE_MS = 6 * 60 * 60 * 1000;
const MAXIMUM_PLAUSIBLE_METERS_PER_SECOND = 12;
const DISTANCE_TOLERANCE_METERS = 60;

type RunProofPayload = {
  societaId: number;
  livello: 1 | 2 | 3;
  issuedAt: number;
  nonce: string;
};

export async function getArcadeLeaderboard(): Promise<ArcadeLeaderboardEntry[]> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("classifica_arcade")
      .select("nome_giocatore,societa_id,livello,metri,updated_at")
      .order("metri", { ascending: false })
      .order("livello", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: leaderboardEntryId(row.nome_giocatore, row.societa_id),
      nomeGiocatore: row.nome_giocatore,
      societaId: row.societa_id,
      livello: normalizeLevel(row.livello),
      metri: row.metri,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export function createArcadeRunProof(societaId: number, livello: number) {
  if (!isValidTeam(societaId) || !isValidLevel(livello)) return null;
  const payload: RunProofPayload = {
    societaId,
    livello,
    issuedAt: Date.now(),
    nonce: randomBytes(12).toString("base64url"),
  };
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

  const payload = verifyRunProof(input.proof);
  const metri = Math.trunc(Number(input.metri));
  if (!payload || !isValidTeam(payload.societaId) || !isValidLevel(payload.livello)) {
    return serviceUnavailable();
  }
  if (!Number.isSafeInteger(metri) || metri < MINIMUM_METERS || metri > MAXIMUM_METERS) {
    return { ok: false, message: "Percorri almeno 100 metri per entrare in classifica." };
  }
  const elapsedSeconds = Math.max(0, (Date.now() - payload.issuedAt) / 1000);
  if (metri > elapsedSeconds * MAXIMUM_PLAUSIBLE_METERS_PER_SECOND + DISTANCE_TOLERANCE_METERS) {
    return { ok: false, message: "Il risultato non può essere verificato. Riprova con una nuova partita." };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const normalizedName = normalizeArcadePlayerNameForLookup(nomeGiocatore);
    const { data: previous } = await supabase
      .from("classifica_arcade")
      .select("metri,livello,updated_at")
      .eq("nome_giocatore_normalizzato", normalizedName)
      .maybeSingle();

    const { data, error } = await supabase.rpc("salva_record_arcade", {
      p_nome_giocatore: nomeGiocatore,
      p_societa_id: payload.societaId,
      p_livello: payload.livello,
      p_metri: metri,
    });
    if (error) return serviceUnavailable();

    const returnedRecord = extractRecordMeters(data);
    const { data: savedRow, error: savedError } = await supabase
      .from("classifica_arcade")
      .select("metri,livello,updated_at")
      .eq("nome_giocatore_normalizzato", normalizedName)
      .maybeSingle();
    if (savedError || !savedRow) return serviceUnavailable();

    const metriRecord = returnedRecord ?? savedRow.metri;
    const improved = !previous || metri > previous.metri;
    const [leaderboard, position] = await Promise.all([
      getArcadeLeaderboard(),
      getArcadePosition(savedRow.metri, normalizeLevel(savedRow.livello), savedRow.updated_at),
    ]);
    const highlightedId = leaderboardEntryId(nomeGiocatore, payload.societaId);
    const topMessage = position <= 100
      ? `Sei entrato nella Top 100! Posizione: ${position}ª.`
      : "Non hai raggiunto la Top 100. Continua a correre e riprova!";

    return {
      ok: true,
      message: `${improved
        ? "Nuovo record salvato nella classifica."
        : `Il tuo record resta ${metriRecord.toLocaleString("it-IT")} metri.`} ${topMessage}`,
      metriRecord,
      position,
      highlightedId,
      leaderboard,
    };
  } catch {
    return serviceUnavailable();
  }
}

async function getArcadePosition(metri: number, livello: 1 | 2 | 3, updatedAt: string) {
  const table = () => getSupabaseAdminClient().from("classifica_arcade").select("metri", { count: "exact", head: true });
  const [moreMeters, sameMetersHigherLevel, sameScoreEarlier] = await Promise.all([
    table().gt("metri", metri),
    table().eq("metri", metri).gt("livello", livello),
    table().eq("metri", metri).eq("livello", livello).lt("updated_at", updatedAt),
  ]);
  if (moreMeters.error || sameMetersHigherLevel.error || sameScoreEarlier.error) throw new Error("Posizione non disponibile");
  return (moreMeters.count ?? 0) + (sameMetersHigherLevel.count ?? 0) + (sameScoreEarlier.count ?? 0) + 1;
}

function leaderboardEntryId(nome: string, societaId: number) {
  return `${normalizeArcadePlayerNameForLookup(nome)}:${societaId}`;
}

export function normalizeArcadePlayerName(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeArcadePlayerNameForLookup(value: string) {
  return normalizeArcadePlayerName(value).toLocaleLowerCase("it-IT");
}

function verifyRunProof(proof: string): RunProofPayload | null {
  try {
    const [encoded, signature] = String(proof).split(".");
    if (!encoded || !signature) return null;
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RunProofPayload;
    if (Date.now() - payload.issuedAt < 0 || Date.now() - payload.issuedAt > MAXIMUM_RUN_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
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

function normalizeLevel(value: number): 1 | 2 | 3 {
  return value === 3 ? 3 : value === 2 ? 2 : 1;
}

function serviceUnavailable(): ArcadeSaveResult {
  return { ok: false, message: "La classifica non è momentaneamente disponibile. Riprova più tardi." };
}
