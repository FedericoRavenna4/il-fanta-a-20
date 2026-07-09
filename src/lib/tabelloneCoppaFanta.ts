import fs from "fs";
import path from "path";

export type PartitaCoppaFanta = {
  stagione: string;
  lato: string;
  turno: string;
  gara: string;
  posizione1: number | null;
  squadra1: string;
  posizione2: number | null;
  squadra2: string;
  vincitore: string;
  modalita: string;
};

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  return line.split(",");
}

function toNumber(value: string | undefined) {
  if (!value || value.trim() === "") return null;
  const number = Number(value.trim().replace(",", "."));
  return Number.isNaN(number) ? null : number;
}

export function getTabelloneCoppaFanta(): PartitaCoppaFanta[] {
  const filePath = path.join(process.cwd(), "data", "tabellone_coppa_fanta.csv");

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
      lato: columns[1]?.trim() ?? "",
      turno: columns[2]?.trim() ?? "",
      gara: columns[3]?.trim() ?? "",
      posizione1: toNumber(columns[4]),
      squadra1: columns[5]?.trim() ?? "",
      posizione2: toNumber(columns[6]),
      squadra2: columns[7]?.trim() ?? "",
      vincitore: columns[8]?.trim() ?? "",
      modalita: columns[9]?.trim() ?? "",
    };
  });
}