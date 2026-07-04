import fs from "fs";
import path from "path";

export type RankingItem = {
  posizione: number;
  squadraId: number;
  nomeRanking: string;
  puntiRanking: number;
  trend: string;
};

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").trim());
}

export function getRanking(): RankingItem[] {
  const filePath = path.join(process.cwd(), "data", "ranking.csv");
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
      posizione: Number(row.Posizione),
      squadraId: Number(row.Squadra_ID),
      nomeRanking: row.Nome_Ranking,
      puntiRanking: Number(row.Punti_Ranking.replace(",", ".")),
      trend: row.Trend,
    };
  });
}