"use server";

import { claimArcadeNickname, createArcadeRunProof, saveArcadeRecord } from "@/lib/arcade/server";
import type { ArcadeNicknameClaimResult, ArcadeRunProofResult, ArcadeSaveResult } from "@/lib/arcade/types";

export async function verifyArcadeNickname(playerId: string, nickname: string): Promise<ArcadeNicknameClaimResult> {
  return claimArcadeNickname(playerId, nickname);
}

export async function beginArcadeRun(playerId: string, nomeGiocatore: string, societaId: number, livello: number): Promise<ArcadeRunProofResult> {
  try {
    const proof = await createArcadeRunProof(playerId, nomeGiocatore, Number(societaId), Number(livello));
    return proof ? { ok: true, proof } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function submitArcadeRecord(input: {
  playerId: string;
  nomeGiocatore: string;
  metri: number;
  proof: string;
}): Promise<ArcadeSaveResult> {
  return saveArcadeRecord(input);
}
