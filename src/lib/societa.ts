import fs from "fs";
import path from "path";
import { getRanking } from "./ranking";

export type Societa = {
  id: number;
  slug: string;
  nome: string;
  fantallenatore: string;
  nicknameInstagram: string;
  squadraReale: string;
  stagioneIngresso: string;
  legaAttuale: string;
  girone: string;
  logo: string;
  ranking: number;
  puntiRanking: number;
  leader: boolean;
  badgeNewEntry: boolean;
  badgeNeopromossa: boolean;
  badgeCampioneSerieA: boolean;
};

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").trim());
}

function isSi(value: string | undefined) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized === "si";
}

export function getSocieta(): Societa[] {
  const filePath = path.join(process.cwd(), "data", "societa.csv");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const ranking = getRanking();

  const lines = fileContent.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]).map((header) =>
    header.replace(/^\uFEFF/, "")
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const id = Number(row.ID_Squadra);
    const rankingItem = ranking.find((item) => item.squadraId === id);

    const slug = row.Nome_Società
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const girone = row.Girone || "";

    const lega =
      girone && girone !== "-"
        ? `${row.Lega_Attuale} - Girone ${girone}`
        : row.Lega_Attuale;

    return {
      id,
      slug,
      nome: row.Nome_Società,
      fantallenatore: row.Fantallenatore,
      nicknameInstagram: row.Nickname_Instagram,
      squadraReale: row.Squadra_Reale,
      stagioneIngresso: row.Stagione_Ingresso,
      legaAttuale: lega,
      girone,
      logo: `/societa/${row.Logo}`,
      ranking: rankingItem?.posizione ?? 999,
      puntiRanking: rankingItem?.puntiRanking ?? 0,
      leader: rankingItem?.posizione === 1,
      badgeNewEntry: isSi(row.Badge_New_Entry),
      badgeNeopromossa: isSi(row.Badge_Neopromossa),
      badgeCampioneSerieA: isSi(row.Badge_Campione_Serie_A),
    };
  });
}