import fs from "fs";
import path from "path";
import { getRisultati } from "./risultati";

export type Palmares = {
  squadraId: number;
  nomeSquadra: string;
  totaleTrofei: number;
  campionati: number;
  campionatiSerieA: number;
  campionatiSerieB: number;
  campionatiSerieC: number;
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
  const campionatiPerSquadra = new Map<
    number,
    { serieA: number; serieB: number; serieC: number }
  >();

  getRisultati()
    .filter(
      (item) =>
        item.competizione === "Campionato" &&
        ["1", "vincitore"].includes(item.risultatoTesto.trim().toLowerCase())
    )
    .forEach((item) => {
      const titoli = campionatiPerSquadra.get(item.squadraId) ?? {
        serieA: 0,
        serieB: 0,
        serieC: 0,
      };

      if (item.lega === "Serie A") titoli.serieA += 1;
      if (item.lega === "Serie B") titoli.serieB += 1;
      if (item.lega.startsWith("Serie C")) titoli.serieC += 1;

      campionatiPerSquadra.set(item.squadraId, titoli);
    });

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const squadraId = Number(row.Squadra_ID);
    const campionati = campionatiPerSquadra.get(squadraId) ?? {
      serieA: 0,
      serieB: 0,
      serieC: 0,
    };

    return {
      squadraId,
      nomeSquadra: row.Nome_Squadra,
      totaleTrofei: Number(row.Totale_Trofei || 0),
      campionati: Number(row.Campionati || 0),
      campionatiSerieA: campionati.serieA,
      campionatiSerieB: campionati.serieB,
      campionatiSerieC: campionati.serieC,
      championsLeague: Number(row.Champions_League || 0),
      europaLeague: Number(row.Europa_League || 0),
      conferenceLeague: Number(row.Conference_League || 0),
      coppaFantaA20: Number(row.Coppa_Fanta_a_20 || 0),
    };
  });
}
