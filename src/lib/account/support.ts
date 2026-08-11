export const SUPPORT_CONFIRMATION_MESSAGE = "La squadra scelta resterà la tua squadra tifata fino al termine della stagione.";

export const SUPPORT_BONUS_POINTS = {
  campionato: 50,
  coppaFanta20: 40,
  championsLeague: 30,
  europaLeague: 20,
  conferenceLeague: 10,
} as const;

export function supportBonusTotal(points: readonly number[]) {
  return points.reduce((total, value) => total + value, 0);
}

export function canSelectSupportedTeam(societaId: number | null, alreadySelected: boolean) {
  return societaId === null && !alreadySelected;
}

export function isSupportBonusEligible(selectedAt: string, winnerRecordedAt: string, isOfficial: boolean) {
  return !isOfficial && new Date(selectedAt).getTime() <= new Date(winnerRecordedAt).getTime();
}
