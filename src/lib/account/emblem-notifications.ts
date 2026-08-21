export type EmblemNotification = { id: number; name: string; rarity: "comune" | "raro" | "epico" | "leggendario"; description: string; imageUrl: string };

export type SocietaEmblemNotification = {
  id: number;
  societaId: number;
  societaName: string;
  name: string;
  rarity: "comune" | "raro" | "epico" | "leggendario";
  description: string;
  imageUrl: string;
  audience: "official" | "supporter";
};

export function emblemNotificationStorageKey(profileId: string) {
  return `fanta20:emblem-notifications:v1:${profileId}`;
}

export function parseNotifiedEmblemIds(value: string | null) {
  if (!value) return null;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? new Set(parsed.filter(Number.isInteger)) : null; } catch { return null; }
}

export function pendingEmblemNotifications(emblems: EmblemNotification[], notified: Set<number>) {
  return emblems.filter((emblem) => !notified.has(emblem.id));
}
