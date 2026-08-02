import { PLAYER_ID_KEY, PLAYER_NICKNAME_KEY } from "./storage";
export const PLAYER_NICKNAME_MIN_LENGTH = 2;
export const PLAYER_NICKNAME_MAX_LENGTH = 30;
let volatilePlayerId = "";

export function getOrCreatePlayerId() {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.localStorage.getItem(PLAYER_ID_KEY) ?? "";
    if (isValidPlayerId(saved)) return saved;
    const created = createPlayerId();
    window.localStorage.setItem(PLAYER_ID_KEY, created);
    return created;
  } catch {
    if (!volatilePlayerId) volatilePlayerId = createPlayerId();
    return volatilePlayerId;
  }
}

export function isValidPlayerId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createPlayerId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((value, index) => `${index === 4 || index === 6 || index === 8 || index === 10 ? "-" : ""}${value.toString(16).padStart(2, "0")}`).join("");
}

export function sanitizePlayerNickname(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function validatePlayerNickname(value: string) {
  const nickname = sanitizePlayerNickname(value);
  if (nickname.length < PLAYER_NICKNAME_MIN_LENGTH || nickname.length > PLAYER_NICKNAME_MAX_LENGTH) {
    return { ok: false as const, nickname, message: "Inserisci un nome da 2 a 30 caratteri." };
  }
  if (/[<>\u0000-\u001f\u007f]/.test(nickname)) {
    return { ok: false as const, nickname, message: "Il nome contiene caratteri non validi." };
  }
  return { ok: true as const, nickname };
}

export function readPlayerNickname() {
  if (typeof window === "undefined") return "";
  try {
    const result = validatePlayerNickname(window.localStorage.getItem(PLAYER_NICKNAME_KEY) ?? "");
    return result.ok ? result.nickname : "";
  } catch {
    return "";
  }
}

export function writePlayerNickname(value: string) {
  const result = validatePlayerNickname(value);
  if (!result.ok || typeof window === "undefined") return result;
  try {
    window.localStorage.setItem(PLAYER_NICKNAME_KEY, result.nickname);
  } catch {
    // Senza storage persistente il nickname resta valido per la sessione corrente.
  }
  return result;
}
