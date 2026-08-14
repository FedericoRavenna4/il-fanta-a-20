export function safeAccountReturnUrl(value: unknown, fallback = "/account") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try { const url = new URL(value, "https://fanta-a-20.local"); return url.origin === "https://fanta-a-20.local" && !url.pathname.startsWith("/account/accedi") ? `${url.pathname}${url.search}${url.hash}` : fallback; }
  catch { return fallback; }
}
