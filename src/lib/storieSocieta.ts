import fs from "fs";
import path from "path";

export type StoriaSocietaEditoriale = {
  squadraId: number;
  descrizione: string;
};

function parseLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  return line.split(",");
}

export function getStorieSocieta(): StoriaSocietaEditoriale[] {
  const filePath = path.join(process.cwd(), "data", "storie_societa.csv");

  if (!fs.existsSync(filePath)) {
    console.log("storie_societa.csv NON trovato");
    return [];
  }

  const file = fs.readFileSync(filePath, "utf8");
  const lines = file.split(/\r?\n/).filter((line) => line.trim());

  return lines.slice(1).map((line) => {
    const columns = parseLine(line);

    return {
      squadraId: Number(columns[0]),
      descrizione: String(columns.slice(2).join(" "))
  .trim()
  .replace(/^"+|"+$/g, ""),
    };
  });
}