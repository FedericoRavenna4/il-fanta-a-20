export type RatingChangeReason =
  | "bonus"
  | "malus"
  | "boss-reward"
  | "luperto-save";

export function logRatingChange(
  previous: number,
  next: number,
  reason: RatingChangeReason,
  detail: string
) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[FantaRunner][Voto]", {
    reason,
    detail,
    previous,
    next,
    delta: Math.round((next - previous) * 10) / 10,
  });
}
