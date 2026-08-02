import { PERSONAL_ARCADE_RECORD_KEY } from "./storage";

export type PersonalArcadeRecord = { level: 1 | 2 | 3; meters: number };

export function readPersonalArcadeRecord(): PersonalArcadeRecord {
  if (typeof window === "undefined") return { level: 1, meters: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PERSONAL_ARCADE_RECORD_KEY) ?? "null") as Partial<PersonalArcadeRecord> | null;
    if (parsed && (parsed.level === 1 || parsed.level === 2 || parsed.level === 3) && Number.isFinite(parsed.meters)) {
      return { level: parsed.level, meters: Math.max(0, Math.round(parsed.meters ?? 0)) };
    }
  } catch {
    // Un valore non valido equivale all'assenza di un record locale.
  }
  return { level: 1, meters: 0 };
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
