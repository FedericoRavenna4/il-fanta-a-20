import "server-only";
import { parseRecognitionOutput } from "./logic";

const SCHEMA = { type: "object", additionalProperties: false, required: ["teamA", "teamB"], properties: { teamA: { $ref: "#/$defs/team" }, teamB: { $ref: "#/$defs/team" } }, $defs: { team: { type: "object", additionalProperties: false, required: ["detectedName", "formation", "players"], properties: { detectedName: { type: "string" }, formation: { type: ["string", "null"] }, players: { type: "array", minItems: 1, maxItems: 15, items: { type: "string" } } } } } };

export async function recognizeLineups(image: { bytes: Uint8Array; mime: string }) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("OPENAI_API_KEY_MISSING");
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || "gpt-5-mini", store: false, max_output_tokens: 1200, instructions: "Estrai esclusivamente le due società fantasy, il modulo e i nomi degli undici titolari da questo screenshot Fantacalcio. Ignora voti, fantavoti, bonus, malus, cartellini, gol, risultato e immagini. Conserva i nomi esattamente come leggibili. La squadra nella metà superiore è teamA, quella inferiore teamB. Non inventare testo illeggibile.", input: [{ role: "user", content: [{ type: "input_text", text: "Analizza questa singola immagine." }, { type: "input_image", image_url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`, detail: "high" }] }], text: { format: { type: "json_schema", name: "fantabet_lineups", strict: true, schema: SCHEMA } } }) });
    if (!response.ok) throw new Error(`OPENAI_${response.status}`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("OUTPUT_AI_VUOTO"); return parseRecognitionOutput(JSON.parse(text));
  } finally { clearTimeout(timeout); }
}
