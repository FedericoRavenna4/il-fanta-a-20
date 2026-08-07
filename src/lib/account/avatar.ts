export const ACCOUNT_AVATAR_BUCKET = "account-avatars";
export const ACCOUNT_AVATAR_MAX_BYTES = 750 * 1024;
export const ACCOUNT_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof ACCOUNT_AVATAR_MIME_TYPES)[number], "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function accountInitials(username: string) {
  const parts = username.trim().split(/[_\s]+/).filter(Boolean);
  if (!parts.length) return "FA";
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

export function isOwnedAvatarPath(path: string | null, userId: string) {
  return Boolean(path && new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/avatar\\.(?:jpg|png|webp)$`).test(path));
}

function hasSafeImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function validateAccountAvatar(file: File) {
  if (!ACCOUNT_AVATAR_MIME_TYPES.includes(file.type as (typeof ACCOUNT_AVATAR_MIME_TYPES)[number])) return { ok: false as const, message: "Usa un’immagine JPG, PNG o WebP." };
  if (file.size <= 0 || file.size > ACCOUNT_AVATAR_MAX_BYTES) return { ok: false as const, message: "L’immagine deve pesare al massimo 750 KB." };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasSafeImageSignature(bytes, file.type)) return { ok: false as const, message: "Il contenuto del file non corrisponde a un’immagine valida." };
  const mime = file.type as (typeof ACCOUNT_AVATAR_MIME_TYPES)[number];
  return { ok: true as const, extension: extensions[mime], contentType: mime };
}
