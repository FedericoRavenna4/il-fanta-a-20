export function normalizeAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function parseAdminEmailAllowlist(raw: string | undefined) {
  return new Set((raw ?? "").split(",").map(normalizeAdminEmail).filter(Boolean));
}

export function evaluateAdminIdentity(email: string | null | undefined, rawAllowlist: string | undefined) {
  const normalizedEmail = normalizeAdminEmail(email);
  if (!normalizedEmail) return "unauthenticated" as const;
  return parseAdminEmailAllowlist(rawAllowlist).has(normalizedEmail) ? "authorized" as const : "unauthorized" as const;
}
