import fs from "fs";
import path from "path";

export type StatoEmblema = "No" | "Sì" | "Difendi";

export type EmblemiSocieta = {
  squadraId: number;
  nomeSocieta: string;
  stagioneIngresso: string;
  emblemi: Record<string, StatoEmblema>;
};

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").trim());
}

function normalizeStato(value: string): StatoEmblema {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "si") return "Sì";
  if (normalized === "difendi") return "Difendi";

  return "No";
}

export function getEmblemi(): EmblemiSocieta[] {
  const filePath = path.join(process.cwd(), "data", "emblemi.csv");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const fileContent = fs.readFileSync(filePath, "utf-8").trim();

  if (!fileContent) {
    return [];
  }

  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.replace(/^\uFEFF/, "")
  );

  const colonneFisse = new Set([
    "ID_Squadra",
    "Nome_Società",
    "Stagione_Ingresso",
  ]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const emblemi: Record<string, StatoEmblema> = {};

    headers.forEach((header) => {
      if (!colonneFisse.has(header)) {
        emblemi[header] = normalizeStato(row[header] ?? "No");
      }
    });

    return {
      squadraId: Number(row.ID_Squadra),
      nomeSocieta: row.Nome_Società,
      stagioneIngresso: row.Stagione_Ingresso,
      emblemi,
    };
  });
}