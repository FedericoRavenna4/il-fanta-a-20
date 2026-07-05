import fs from "fs";
import path from "path";

export type Palmares = {
  squadraId: number;
  nomeSquadra: string;
  totaleTrofei: number;
  campionati: number;
  championsLeague: number;
  europaLeague: number;
  conferenceLeague: number;
  coppaFantaA20: number;
};

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").trim());
}

export function getPalmares(): Palmares[] {
  const filePath = path.join(process.cwd(), "data", "sala_trofei.csv");
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const lines = fileContent.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return {
      squadraId: Number(row.Squadra_ID),
      nomeSquadra: row.Nome_Squadra,
      totaleTrofei: Number(row.Totale_Trofei || 0),
      campionati: Number(row.Campionati || 0),
      championsLeague: Number(row.Champions_League || 0),
      europaLeague: Number(row.Europa_League || 0),
      conferenceLeague: Number(row.Conference_League || 0),
      coppaFantaA20: Number(row.Coppa_Fanta_a_20 || 0),
    };
  });
}