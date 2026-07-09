import fs from "fs";
import path from "path";

export type StatisticheGiocatore = {
  stagione: string;
  ruolo: string;
  giocatore: string;
  squadra: string;
  partite: number | null;
  mediaVoto: number | null;
  fantaMedia: number | null;
  golFatti: number | null;
  golSubiti: number | null;
  rigoriParati: number | null;
  assist: number | null;
  cleanSheet: number | null;
  ammonizioni: number | null;
  espulsioni: number | null;
};

function splitLine(line: string) {
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

function toNumber(value: string | undefined) {
  if (!value) return null;

  const cleaned = value.trim().replace(",", ".");

  if (cleaned === "") return null;

  const number = Number(cleaned);

  return Number.isNaN(number) ? null : number;
}

export function getStatisticheGiocatori(): StatisticheGiocatore[] {
  const filePath = path.join(process.cwd(), "data", "statistiche_giocatori.csv");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const file = fs.readFileSync(filePath, "utf8");

  const lines = file
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  return lines.slice(1).map((line) => {
    const columns = splitLine(line);

    return {
      stagione: columns[0]?.trim() ?? "",
      ruolo: columns[1]?.trim() ?? "",
      giocatore: columns[2]?.trim() ?? "",
      squadra: columns[3]?.trim() ?? "",
      partite: toNumber(columns[4]),
      mediaVoto: toNumber(columns[5]),
      fantaMedia: toNumber(columns[6]),
      golFatti: toNumber(columns[7]),
      golSubiti: toNumber(columns[8]),
      rigoriParati: toNumber(columns[9]),
      assist: toNumber(columns[10]),
      cleanSheet: toNumber(columns[11]),
      ammonizioni: toNumber(columns[12]),
      espulsioni: toNumber(columns[13]),
    };
  });
}