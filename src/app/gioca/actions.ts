"use server";

import { createArcadeRunProofForCurrentUser, saveArcadeRecord } from "@/lib/arcade/server";
import type { ArcadeRunProofResult, ArcadeSaveResult } from "@/lib/arcade/types";

export async function beginArcadeRun(societaId: number, livello: number): Promise<ArcadeRunProofResult> {
  try {
    const proof = await createArcadeRunProofForCurrentUser(Number(societaId), Number(livello));
    return proof ? { ok: true, proof } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function submitArcadeRecord(input: {
  metri: number;
  proof: string;
}): Promise<ArcadeSaveResult> {
  return saveArcadeRecord(input);
}
