"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getLineupAdminOptions } from "@/lib/fantabet-lineups/data.server";
import { buildLineupPreview, validateConfirmation } from "@/lib/fantabet-lineups/logic";
import { recognizeLineups } from "@/lib/fantabet-lineups/recognition.server";
import type { ConfirmLineupInput, LineupPreview } from "@/lib/fantabet-lineups/types";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]); const MAX_BYTES = 10 * 1024 * 1024;
export type LineupActionResult = { ok: boolean; message: string; preview?: LineupPreview };
function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }

export async function analyzeLineupScreenshotAction(formData: FormData): Promise<LineupActionResult> {
  await requireImportAdmin(); const seasonId = Number(formData.get("seasonId")); const matchday = Number(formData.get("matchday")); const file = formData.get("screenshot");
  if (!Number.isSafeInteger(seasonId) || seasonId <= 0 || !Number.isInteger(matchday) || matchday < 1 || matchday > 38) return { ok: false, message: "Seleziona stagione e giornata valide." };
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Seleziona uno screenshot." };
  if (!ALLOWED.has(file.type)) return { ok: false, message: "Formato non supportato. Usa PNG, JPG/JPEG o WEBP." };
  if (file.size > MAX_BYTES) return { ok: false, message: "Immagine troppo grande. Il limite è 10 MB." };
  if (file.size < 12_000) return { ok: false, message: "Immagine troppo piccola o illeggibile. Usa lo screenshot originale." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  try { const [recognized, options] = await Promise.all([recognizeLineups({ bytes, mime: file.type }), getLineupAdminOptions(seasonId)]); return { ok: true, message: "Analisi completata. Controlla e conferma tutti i titolari.", preview: buildLineupPreview(recognized, seasonId, matchday, options.teams) }; }
  catch (error) { const code = error instanceof Error ? error.message : ""; if (code === "OPENAI_API_KEY_MISSING") return { ok: false, message: "Recognition non configurata: manca OPENAI_API_KEY sul server." }; if (code === "OUTPUT_AI_INVALIDO" || code === "OUTPUT_AI_VUOTO") return { ok: false, message: "Lo screenshot non è abbastanza leggibile. Prova un'immagine più nitida." }; if (error instanceof Error && error.name === "AbortError") return { ok: false, message: "Analisi scaduta. Riprova esplicitamente." }; return { ok: false, message: "Analisi non riuscita. Nessun dato è stato salvato." }; }
}

export async function confirmLineupsAction(raw: string): Promise<LineupActionResult> {
  await requireImportAdmin(); let input: ConfirmLineupInput; try { input = JSON.parse(raw) as ConfirmLineupInput; } catch { return { ok: false, message: "Dati di conferma non validi." }; }
  const options = await getLineupAdminOptions(input.seasonId); const validation = validateConfirmation(input, options.teams); if (validation) return { ok: false, message: validation };
  const { data, error } = await admin().rpc("admin_upsert_fantabet_lineups", { p_stagione_id: input.seasonId, p_numero_giornata: input.matchday, p_lineups: input.teams.map((team) => ({ societa_id: team.societyId, modulo: team.formation, player_ids: team.playerIds })) });
  if (error || data !== true) return { ok: false, message: "Salvataggio rifiutato. Le formazioni precedenti sono rimaste invariate." };
  revalidatePath("/admin/formazioni"); revalidatePath("/fantabet"); return { ok: true, message: "Le due formazioni sono state salvate atomicamente." };
}
