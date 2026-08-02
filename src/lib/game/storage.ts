export const ARCADE_STORAGE_VERSION = 2;
export const ARCADE_STORAGE_VERSION_KEY = "fanta20_arcade_storage_version";

export const PLAYER_ID_KEY = "fanta20_player_id";
export const PLAYER_NICKNAME_KEY = "fanta20_player_nickname";
export const PERSONAL_ARCADE_RECORD_KEY = "fanta-runner-personal-arcade-record-v2";
export const LEGACY_PERSONAL_DISTANCE_RECORD_KEY = "fanta-runner-personal-distance-record";
export const ARCADE_PROGRESS_STORAGE_KEY = "fanta-a-20-arcade-progress-v1";
export const BARRIER_DEBUG_STORAGE_KEY = "fanta20_barrier_debug";

const ARCADE_EXACT_STORAGE_KEYS = [
  PLAYER_ID_KEY,
  PLAYER_NICKNAME_KEY,
  PERSONAL_ARCADE_RECORD_KEY,
  LEGACY_PERSONAL_DISTANCE_RECORD_KEY,
  ARCADE_PROGRESS_STORAGE_KEY,
  BARRIER_DEBUG_STORAGE_KEY,
] as const;

const ARCADE_STORAGE_PREFIXES = ["fanta-runner-best:"] as const;

export function arcadeTeamBestStorageKey(teamId: number) {
  return `fanta-runner-best:${teamId}`;
}

export function ensureArcadeStorageVersion() {
  if (typeof window === "undefined") return false;
  try {
    const expectedVersion = String(ARCADE_STORAGE_VERSION);
    if (window.localStorage.getItem(ARCADE_STORAGE_VERSION_KEY) === expectedVersion) {
      return false;
    }

    for (const key of ARCADE_EXACT_STORAGE_KEYS) window.localStorage.removeItem(key);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && ARCADE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem(ARCADE_STORAGE_VERSION_KEY, expectedVersion);
    return true;
  } catch {
    // In modalita privata o con storage bloccato il gioco resta utilizzabile.
    return false;
  }
}
