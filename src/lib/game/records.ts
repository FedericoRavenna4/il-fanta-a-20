export const PERSONAL_DISTANCE_RECORD_KEY = "fanta-runner-personal-distance-record";

export function readPersonalDistanceRecord() {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(PERSONAL_DISTANCE_RECORD_KEY) ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  } catch {
    return 0;
  }
}

export function writePersonalDistanceRecord(distance: number) {
  if (typeof window === "undefined") return;
  try {
    const nextRecord = Math.max(readPersonalDistanceRecord(), Math.round(distance));
    window.localStorage.setItem(PERSONAL_DISTANCE_RECORD_KEY, String(nextRecord));
  } catch {
    // Il gioco resta utilizzabile anche quando lo storage locale non è disponibile.
  }
}
