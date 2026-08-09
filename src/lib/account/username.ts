export const ACCOUNT_USERNAME_MIN_LENGTH = 3;
export const ACCOUNT_USERNAME_MAX_LENGTH = 24;
export const ACCOUNT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,23}$/;

export const RESERVED_ACCOUNT_USERNAMES = new Set([
  "admin", "administrator", "amministratore", "staff", "moderator", "mod",
  "official", "ufficiale", "support", "assistenza", "system", "root",
  "fantaa20", "fanta20", "ilfantaa20",
]);

export function normalizeAccountUsername(value: string) {
  return value.trim().toLowerCase();
}

const ACCOUNT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classifyAccountLogin(value: string) {
  const trimmed = value.trim();
  return ACCOUNT_EMAIL_PATTERN.test(trimmed)
    ? { type: "email" as const, value: trimmed.toLowerCase() }
    : { type: "username" as const, value: normalizeAccountUsername(trimmed) };
}

export function validateAccountUsername(value: string) {
  const username = value.trim();
  const normalized = normalizeAccountUsername(username);
  if (!ACCOUNT_USERNAME_PATTERN.test(username)) {
    return { ok: false as const, message: "Usa 3-24 caratteri: inizia con una lettera e usa solo lettere, numeri o underscore." };
  }
  if (RESERVED_ACCOUNT_USERNAMES.has(normalized)) {
    return { ok: false as const, message: "Questo username è riservato." };
  }
  return { ok: true as const, username, normalized };
}
