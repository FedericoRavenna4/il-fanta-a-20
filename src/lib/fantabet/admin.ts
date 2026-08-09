import type { FantaBetType } from "./types";

export const STANDARD_V1_POINTS: Record<FantaBetType, number> = { "1X2": 3, UNDER_OVER_2_5: 1, RISULTATO_ESATTO: 10, FANTAPUNTEGGIO_1X2: 2 };
export const STANDARD_V1_TYPES: FantaBetType[] = ["1X2", "1X2", "UNDER_OVER_2_5", "RISULTATO_ESATTO", "FANTAPUNTEGGIO_1X2"];
export const FANTABET_ADMIN_SEASON = "2026/27";

export function isAdminRoundEditable(round: { status: string; opensAt: string }, now = new Date()) {
  return round.status === "bozza" || (round.status === "pubblicata" && now.getTime() < new Date(round.opensAt).getTime());
}

export type AdminBetInput = { partitaId: number; type: FantaBetType; points: number; order: number };
export type AdminRoundInput = { roundId?: number | null; stagioneId: number; giornata: number; opensAt: string; deadlineAt: string; bets: AdminBetInput[] };

export function validateAdminRound(input: AdminRoundInput) {
  const errors: string[] = [];
  if (!Number.isInteger(input.stagioneId) || input.stagioneId <= 0) errors.push("Seleziona una stagione.");
  if (!Number.isInteger(input.giornata) || input.giornata <= 0) errors.push("Seleziona una giornata.");
  if (!input.opensAt || !input.deadlineAt || new Date(input.opensAt).getTime() >= new Date(input.deadlineAt).getTime()) errors.push("Apertura e deadline non sono valide.");
  if (input.bets.length !== 5) errors.push("Seleziona esattamente 5 partite.");
  if (new Set(input.bets.map((bet) => bet.partitaId)).size !== input.bets.length) errors.push("Le partite devono essere distinte.");
  if (new Set(input.bets.map((bet) => bet.order)).size !== 5 || !input.bets.every((bet) => bet.order >= 1 && bet.order <= 5)) errors.push("L’ordine deve contenere le posizioni da 1 a 5.");
  for (const type of Object.keys(STANDARD_V1_POINTS) as FantaBetType[]) {
    const expected = type === "1X2" ? 2 : 1;
    if (input.bets.filter((bet) => bet.type === type).length !== expected) errors.push("Il formato deve rispettare 2+1+1+1.");
  }
  if (input.bets.some((bet) => STANDARD_V1_POINTS[bet.type] !== bet.points)) errors.push("I punti non rispettano STANDARD V1.");
  return [...new Set(errors)];
}

export function roundCompletion(participants: number, confirmed: number) {
  return participants > 0 ? Math.round((confirmed / participants) * 100) : 0;
}

export function confirmedSubmissionsLabel(confirmed: number) {
  return String(Math.max(0, Math.trunc(Number.isFinite(confirmed) ? confirmed : 0)));
}
