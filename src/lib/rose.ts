import fs from "fs";
import path from "path";

export type RosaGiocatore = {
  stagione: string;
  squadraId: number;
  ruolo: string;
  giocatore: string;
  squadraReale: string;
  costo: number;
};

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").trim());
}

export function getRose(): RosaGiocatore[] {
  const filePath = path.join(process.cwd(), "data", "rose.csv");
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const lines = fileContent.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      return {
        stagione: row.Stagione,
        squadraId: Number(row.Squadra_ID),
        ruolo: row.Ruolo,
        giocatore: row.Giocatore,
        squadraReale: row.Squadra_Reale,
        costo: Number(row.Costo || 0),
      };
    })
    .filter((item) => item.giocatore.trim() !== "");
}