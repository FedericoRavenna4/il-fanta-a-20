import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RateLimitScope = "waitlist_submission" | "arcade_record";

export async function consumeRateLimit({
  scope,
  limit,
  windowSeconds,
}: {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
}) {
  const keyHash = await getClientKeyHash();
  const { data, error } = await getSupabaseAdminClient().rpc("consuma_rate_limit", {
    p_chiave_hash: keyHash,
    p_ambito: scope,
    p_limite: limit,
    p_finestra_secondi: windowSeconds,
  });

  if (error || typeof data !== "boolean") {
    throw new Error("Servizio di rate limiting non disponibile.");
  }

  return data;
}

async function getClientKeyHash() {
  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";
  const secret = process.env.RATE_LIMIT_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Configurazione rate limiting non disponibile.");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
