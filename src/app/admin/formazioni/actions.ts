"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getLineupMatchContext } from "@/lib/fantabet-lineups/data.server";
import { buildLineupPreview, validateConfirmation } from "@/lib/fantabet-lineups/logic";
import { RecognitionError, recognizeLineups } from "@/lib/fantabet-lineups/recognition.server";
import { resolveLineupSaveFailure } from "@/lib/fantabet-lineups/save-errors";
import type { ConfirmLineupInput, LineupPreview } from "@/lib/fantabet-lineups/types";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]); const MAX_BYTES = 10 * 1024 * 1024;
export type LineupActionResult = { ok: boolean; message: string; preview?: LineupPreview };
function admin() { return getSupabaseAdminClient() as unknown as SupabaseClient; }

export async function analyzeLineupScreenshotAction(formData: FormData): Promise<LineupActionResult> {
  await requireImportAdmin(); const matchId = Number(formData.get("matchId")); const file = formData.get("screenshot");
  if (!Number.isSafeInteger(matchId) || matchId <= 0) return { ok: false, message: "Seleziona una delle partite FantaBet." };
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Seleziona uno screenshot." };
  if (!ALLOWED.has(file.type)) return { ok: false, message: "Formato non supportato. Usa PNG, JPG/JPEG o WEBP." };
  if (file.size > MAX_BYTES) return { ok: false, message: "Immagine troppo grande. Il limite è 10 MB." };
  if (file.size < 12_000) return { ok: false, message: "Immagine troppo piccola o illeggibile. Usa lo screenshot originale." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  try { const context = await getLineupMatchContext(matchId); const recognized = await recognizeLineups({ bytes, mime: file.type }); return { ok: true, message: "Analisi completata. Controlla e conferma tutti i titolari.", preview: buildLineupPreview(recognized, context.matchId, context.seasonId, context.matchday, context.teams) }; }
  catch (error) {
    if (error instanceof RecognitionError) {
      if (error.code === "OPENAI_API_KEY_MISSING") return { ok: false, message: "Recognition non configurata sul server." };
      if (error.code === "OPENAI_AUTH") return { ok: false, message: "Il servizio di recognition non è autenticato correttamente." };
      if (error.code === "OPENAI_QUOTA" || error.code === "OPENAI_RATE_LIMIT") return { ok: false, message: "Il servizio di recognition non è temporaneamente disponibile." };
      if (error.code === "OPENAI_TIMEOUT") return { ok: false, message: "Analisi scaduta. Riprova esplicitamente." };
      if (error.code === "OPENAI_RESPONSE_EMPTY" || error.code === "OPENAI_RESPONSE_INVALID" || error.code === "OPENAI_SCHEMA_INVALID") return { ok: false, message: "Lo screenshot non ha prodotto una formazione leggibile. Prova un'immagine più nitida." };
      return { ok: false, message: "Analisi non riuscita. Nessun dato è stato salvato." };
    }
    console.error("[fantabet-lineups:context]", { category: error instanceof Error ? error.message : "UNKNOWN" });
    return { ok: false, message: "La partita FantaBet selezionata non è più disponibile." };
  }
}

export async function confirmLineupsAction(raw: string): Promise<LineupActionResult> {
  await requireImportAdmin(); let input: ConfirmLineupInput; try { input = JSON.parse(raw) as ConfirmLineupInput; } catch { return { ok: false, message: "Dati di conferma non validi." }; }
  let context; try { context = await getLineupMatchContext(input.matchId); } catch (error) { console.error("[fantabet-lineups:confirm-context]", { category: error instanceof Error ? error.message : "UNKNOWN" }); return { ok: false, message: "La partita FantaBet selezionata non è più disponibile." }; }
  if (input.seasonId !== context.seasonId || input.matchday !== context.matchday || new Set(input.teams.map((team) => team.societyId)).size !== 2 || input.teams.some((team) => !context.teams.some((option) => option.id === team.societyId))) return { ok: false, message: "Il contesto della partita FantaBet non è valido." };
  const validation = validateConfirmation(input, context.teams); if (validation) { console.error("[fantabet-lineups:validation]", { category: "CONFIRMATION_REJECTED", matchId: input.matchId }); return { ok: false, message: validation }; }
  const { data, error } = await admin().rpc("admin_upsert_fantabet_lineups", { p_stagione_id: context.seasonId, p_numero_giornata: context.matchday, p_lineups: input.teams.map((team) => ({ societa_id: team.societyId, modulo: team.formation, players: team.players.map((slot) => slot?.source === "roster" ? { source: "roster", roster_player_id: slot.rosterPlayerId, ...(slot.overrideConfirmed ? { override_confirmed: true } : {}) } : slot ? { source: "manual", player: slot.player, role: slot.role, override_confirmed: true } : null), captain_order: team.captainOrder, vice_captain_order: team.viceCaptainOrder })) });
  const saveFailure = resolveLineupSaveFailure(data, error, { seasonId: context.seasonId, matchday: context.matchday, matchId: input.matchId, societyIds: input.teams.map((team) => team.societyId) });
  if (saveFailure) return { ok: false, message: saveFailure };
  revalidatePath("/admin/formazioni"); revalidatePath("/fantabet"); return { ok: true, message: "Le due formazioni sono state salvate atomicamente." };
}
