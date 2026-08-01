"use server";

import { createArcadeRunProof, saveArcadeRecord } from "@/lib/arcade/server";
import type { ArcadeRunProofResult, ArcadeSaveResult } from "@/lib/arcade/types";

export async function beginArcadeRun(nomeGiocatore: string, societaId: number, livello: number): Promise<ArcadeRunProofResult> {
  try {
    const proof = await createArcadeRunProof(nomeGiocatore, Number(societaId), Number(livello));
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
