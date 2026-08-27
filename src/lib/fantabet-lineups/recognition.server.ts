import "server-only";
import { parseRecognitionOutput } from "./logic";

const SCHEMA = { type: "object", additionalProperties: false, required: ["teamA", "teamB"], properties: { teamA: { $ref: "#/$defs/team" }, teamB: { $ref: "#/$defs/team" } }, $defs: { team: { type: "object", additionalProperties: false, required: ["detectedName", "formation", "players"], properties: { detectedName: { type: "string" }, formation: { type: ["string", "null"] }, players: { type: "array", minItems: 1, maxItems: 15, items: { type: "string" } } } } } };
export type RecognitionErrorCode = "OPENAI_API_KEY_MISSING" | "OPENAI_AUTH" | "OPENAI_QUOTA" | "OPENAI_RATE_LIMIT" | "OPENAI_MODEL_UNAVAILABLE" | "OPENAI_REQUEST_INVALID" | "OPENAI_SCHEMA_INVALID" | "OPENAI_TIMEOUT" | "OPENAI_RESPONSE_EMPTY" | "OPENAI_RESPONSE_INVALID" | "OPENAI_UPSTREAM";
export class RecognitionError extends Error { constructor(public readonly code: RecognitionErrorCode, public readonly status?: number) { super(code); this.name = "RecognitionError"; } }
type ApiError = { error?: { code?: string; type?: string; param?: string }; status?: string; incomplete_details?: { reason?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

function logFailure(category: RecognitionErrorCode, details: { status?: number; requestId?: string | null; apiCode?: string; apiType?: string; param?: string; model: string }) {
  console.error("[fantabet-lineups:recognition]", { category, status: details.status, requestId: details.requestId ?? undefined, apiCode: details.apiCode, apiType: details.apiType, param: details.param, model: details.model });
}
function classify(status: number, payload: ApiError): RecognitionErrorCode {
  const code = payload.error?.code?.toLowerCase() ?? ""; const param = payload.error?.param?.toLowerCase() ?? "";
  if (status === 401 || status === 403) return "OPENAI_AUTH";
  if (status === 429) return code.includes("quota") || code.includes("billing") ? "OPENAI_QUOTA" : "OPENAI_RATE_LIMIT";
  if (status === 404 || code.includes("model")) return "OPENAI_MODEL_UNAVAILABLE";
  if (status === 400 && (param.includes("text.format") || code.includes("schema"))) return "OPENAI_SCHEMA_INVALID";
  if (status >= 400 && status < 500) return "OPENAI_REQUEST_INVALID";
  return "OPENAI_UPSTREAM";
}

export async function recognizeLineups(image: { bytes: Uint8Array; mime: string }) {
  const key = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-5-mini";
  if (!key) { logFailure("OPENAI_API_KEY_MISSING", { model }); throw new RecognitionError("OPENAI_API_KEY_MISSING"); }
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model, store: false, max_output_tokens: 3000, instructions: "Estrai esclusivamente le due società fantasy, il modulo e i nomi degli undici titolari da questo screenshot Fantacalcio. Ignora voti, fantavoti, bonus, malus, cartellini, gol, risultato e immagini. Conserva i nomi esattamente come leggibili. La squadra nella metà superiore è teamA, quella inferiore teamB. Non inventare testo illeggibile.", input: [{ role: "user", content: [{ type: "input_text", text: "Analizza questa singola immagine." }, { type: "input_image", image_url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`, detail: "high" }] }], text: { format: { type: "json_schema", name: "fantabet_lineups", strict: true, schema: SCHEMA } } }) });
    let payload: ApiError = {}; try { payload = await response.json() as ApiError; } catch { /* status and request id remain diagnostic */ }
    if (!response.ok) { const category = classify(response.status, payload); logFailure(category, { status: response.status, requestId: response.headers.get("x-request-id"), apiCode: payload.error?.code, apiType: payload.error?.type, param: payload.error?.param, model }); throw new RecognitionError(category, response.status); }
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) { logFailure("OPENAI_RESPONSE_EMPTY", { status: response.status, requestId: response.headers.get("x-request-id"), apiCode: payload.incomplete_details?.reason, model }); throw new RecognitionError("OPENAI_RESPONSE_EMPTY", response.status); }
    try { return parseRecognitionOutput(JSON.parse(text)); } catch { logFailure("OPENAI_RESPONSE_INVALID", { status: response.status, requestId: response.headers.get("x-request-id"), model }); throw new RecognitionError("OPENAI_RESPONSE_INVALID", response.status); }
  } catch (error) {
    if (error instanceof RecognitionError) throw error;
    if (error instanceof Error && error.name === "AbortError") { logFailure("OPENAI_TIMEOUT", { model }); throw new RecognitionError("OPENAI_TIMEOUT"); }
    logFailure("OPENAI_UPSTREAM", { model }); throw new RecognitionError("OPENAI_UPSTREAM");
  } finally { clearTimeout(timeout); }
}
