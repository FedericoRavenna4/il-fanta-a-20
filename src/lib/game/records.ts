export const PERSONAL_DISTANCE_RECORD_KEY = "fanta-runner-personal-distance-record";
export const PERSONAL_ARCADE_RECORD_KEY = "fanta-runner-personal-arcade-record-v2";

export type PersonalArcadeRecord = { level: 1 | 2 | 3; meters: number };

export function readPersonalArcadeRecord(): PersonalArcadeRecord {
  if (typeof window === "undefined") return { level: 1, meters: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PERSONAL_ARCADE_RECORD_KEY) ?? "null") as Partial<PersonalArcadeRecord> | null;
    if (parsed && (parsed.level === 1 || parsed.level === 2 || parsed.level === 3) && Number.isFinite(parsed.meters)) {
      return { level: parsed.level, meters: Math.max(0, Math.round(parsed.meters ?? 0)) };
    }
  } catch {
    // Il formato precedente viene recuperato qui sotto come record di livello 1.
  }
  return { level: 1, meters: readPersonalDistanceRecord() };
}

export function isBetterPersonalRecord(candidate: PersonalArcadeRecord, current: PersonalArcadeRecord) {
  return candidate.level > current.level || (candidate.level === current.level && candidate.meters > current.meters);
}

export function writePersonalArcadeRecord(candidate: PersonalArcadeRecord) {
  if (typeof window === "undefined") return readPersonalArcadeRecord();
  const current = readPersonalArcadeRecord();
  const next = isBetterPersonalRecord(candidate, current) ? candidate : current;
  try {
    window.localStorage.setItem(PERSONAL_ARCADE_RECORD_KEY, JSON.stringify(next));
  } catch {
    // Il gioco resta utilizzabile anche quando lo storage locale non è disponibile.
  }
  return next;
}

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
