import type { ArcadeLeaderboardEntry } from "./types";

export function normalizeArcadeLevel(value: number | null | undefined): 1 | 2 | 3 {
  return value === 3 ? 3 : value === 2 ? 2 : 1;
}

export function normalizeArcadePlayerName(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeArcadePlayerNameForLookup(value: string) {
  return normalizeArcadePlayerName(value).toLocaleLowerCase("it-IT");
}

export function compareArcadeLeaderboardEntries(
  first: ArcadeLeaderboardEntry,
  second: ArcadeLeaderboardEntry
) {
  if (first.livello !== second.livello) return second.livello - first.livello;
  if (first.metri !== second.metri) return second.metri - first.metri;
  const achievedDifference = safeTimestamp(first.updatedAt) - safeTimestamp(second.updatedAt);
  if (achievedDifference !== 0) return achievedDifference;
  return first.id.localeCompare(second.id, "it-IT");
}

export function deduplicateArcadeLeaderboard(entries: readonly ArcadeLeaderboardEntry[]) {
  const bestByNickname = new Map<string, ArcadeLeaderboardEntry>();
  for (const candidate of entries) {
    const identity = normalizeArcadePlayerNameForLookup(candidate.nomeGiocatore);
    if (!identity) continue;
    const current = bestByNickname.get(identity);
    if (!current || compareArcadeLeaderboardEntries(candidate, current) < 0) {
      bestByNickname.set(identity, candidate);
    }
  }
  return [...bestByNickname.values()].sort(compareArcadeLeaderboardEntries);
}

function safeTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}
