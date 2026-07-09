import fs from "fs";
import path from "path";

export type Risultato = {
  stagioneId: number;
  stagione: string;
  lega: string;
  competizione: string;
  nomeStorico: string;
  squadraId: number;
  risultatoTesto: string;
};

const stagioni: Record<number, string> = {
  1: "2023/24",
  2: "2024/25",
  3: "2025/26",
};

function parseCSVLine(line: string) {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result;
}

export function getRisultati(): Risultato[] {
  const filePath = path.join(process.cwd(), "data", "risultati.csv");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const file = fs.readFileSync(filePath, "utf8");
  const lines = file.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const rows = lines.slice(1);

  return rows
    .map((line) => {
      const [
        stagioneId,
        lega,
        competizione,
        nomeStorico,
        squadraId,
        risultatoTesto,
      ] = parseCSVLine(line);

      const stagioneIdNumber = Number(stagioneId);

      return {
        stagioneId: stagioneIdNumber,
        stagione: stagioni[stagioneIdNumber] ?? `Stagione ${stagioneId}`,
        lega,
        competizione,
        nomeStorico,
        squadraId: Number(squadraId),
        risultatoTesto,
      };
    })
    .filter((item) => item.squadraId && item.competizione);
}