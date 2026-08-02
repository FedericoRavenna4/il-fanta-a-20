"use server";

import { claimArcadeNickname, createArcadeRunProof, saveArcadeRecord } from "@/lib/arcade/server";
import type { ArcadeNicknameClaimResult, ArcadeRunProofResult, ArcadeSaveResult } from "@/lib/arcade/types";

export async function claimPlayerNickname(playerId: string, nomeGiocatore: string): Promise<ArcadeNicknameClaimResult> {
  return claimArcadeNickname(playerId, nomeGiocatore);
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
  nomeGiocatore: string;
  metri: number;
  proof: string;
}): Promise<ArcadeSaveResult> {
  return saveArcadeRecord(input);
}
