import fs from "fs";
import path from "path";
import { getSocieta } from "./societa";

export const CATEGORIE_EMBLEMA = [
  "Base",
  "Comune",
  "Raro",
  "Epico",
  "Mitico",
  "Leggendario",
] as const;

export type CategoriaEmblema = (typeof CATEGORIE_EMBLEMA)[number];
export type GruppoEmblema = CategoriaEmblema | "Da difendere";
export type TipoEmblema = "Sbloccabile" | "Difendibile";
export type StatoEmblema = "Sbloccato" | "Da difendere";

export type Emblema = {
  id: number;
  chiave: string;
  nome: string;
  categoria: GruppoEmblema;
  tipo: TipoEmblema;
  descrizione: string | null;
  record: string | null;
  immagine: string;
};

export type EmblemaPosseduto = Emblema & {
  stato: StatoEmblema;
};

export type EmblemiSocieta = {
  squadraId: number;
  nomeSocieta: string;
  emblemi: EmblemaPosseduto[];
};

let catalogoCache: Emblema[] | null = null;
let societaCache: EmblemiSocieta[] | null = null;

function parseCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").replace(/""/g, "\"").trim());
}

function leggiCsv(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "").trim();
  if (!fileContent) return [];

  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizzaTesto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’:_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function creaChiave(value: string) {
  return normalizzaTesto(value).replace(/\s+/g, "_");
}

function normalizzaCategoria(value: string, tipo: TipoEmblema): GruppoEmblema {
  if (tipo === "Difendibile") return "Da difendere";

  const categoria = normalizzaTesto(value);
  if (categoria === "comune") return "Comune";
  if (categoria === "raro") return "Raro";
  if (categoria === "epico") return "Epico";
  if (categoria === "mitico") return "Mitico";
  if (categoria === "leggenda" || categoria === "leggendario") return "Leggendario";
  return "Base";
}

function normalizzaTipo(value: string): TipoEmblema {
  return normalizzaTesto(value) === "difendibile" ? "Difendibile" : "Sbloccabile";
}

function distanzaLevenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function risolviImmagine(nome: string, categoriaOriginale: string, tipo: TipoEmblema) {
  const categoria = normalizzaTesto(categoriaOriginale);
  const cartella = tipo === "Difendibile"
    ? "da difendere"
    : categoria === "leggendario"
      ? "leggenda"
      : categoria;
  return `/emblemi/${cartella}/${creaChiave(nome)}.png`;
}

function trovaEmblemaDaIntestazione(intestazione: string, indice: number, catalogo: Emblema[]) {
  const chiave = normalizzaTesto(intestazione);
  const esatto = catalogo.find((emblema) => normalizzaTesto(emblema.nome) === chiave);
  if (esatto) return esatto;

  const simili = catalogo
    .map((emblema) => ({
      emblema,
      distanza: distanzaLevenshtein(chiave, normalizzaTesto(emblema.nome)),
    }))
    .sort((a, b) => a.distanza - b.distanza);

  if (simili[0]?.distanza <= 2) return simili[0].emblema;
  return catalogo[indice] ?? null;
}

export function getCatalogoEmblemi(): Emblema[] {
  if (catalogoCache) return catalogoCache;

  const rows = leggiCsv(path.join(process.cwd(), "data", "emblemi.csv"));

  catalogoCache = rows
    .map((row) => {
      const id = Number(row.ID);
      const nome = row.Nome?.trim();
      if (!Number.isFinite(id) || !nome) return null;

      const tipo = normalizzaTipo(row.Tipo);

      return {
        id,
        chiave: creaChiave(nome),
        nome,
        categoria: normalizzaCategoria(row.Categoria, tipo),
        tipo,
        descrizione: row.Descrizione?.trim() || null,
        record: row.Record?.trim() || null,
        immagine: risolviImmagine(nome, row.Categoria, tipo),
      } satisfies Emblema;
    })
    .filter((emblema): emblema is Emblema => Boolean(emblema))
    .sort((a, b) => a.id - b.id);

  return catalogoCache;
}

export function getEmblemiSocieta(): EmblemiSocieta[] {
  if (societaCache) return societaCache;

  const filePath = path.join(process.cwd(), "data", "societa_emblemi.csv");
  if (!fs.existsSync(filePath)) return [];

  const catalogo = getCatalogoEmblemi();
  const fileContent = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "").trim();
  if (!fileContent) return [];

  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0]);
  const intestazioniEmblemi = headers.slice(2);
  const mappaColonne = intestazioniEmblemi.map((header, index) =>
    trovaEmblemaDaIntestazione(header, index, catalogo)
  );
  const newEntryIds = new Set(getSocieta().filter((team) => team.badgeNewEntry).map((team) => team.id));

  societaCache = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const emblemi = mappaColonne.flatMap((emblema, index) => {
      if (!emblema) return [];
      const cella = values[index + 2]?.trim().toUpperCase();
      if (cella !== "X" && cella !== "D") return [];
      return [{
        ...emblema,
        stato: cella === "D" ? "Da difendere" : "Sbloccato",
      } satisfies EmblemaPosseduto];
    });

    return {
      nomeSocieta: values[0] ?? "",
      squadraId: Number(values[1]),
      emblemi: newEntryIds.has(Number(values[1])) ? [] : emblemi,
    };
  }).filter((societa) => Number.isFinite(societa.squadraId));

  return societaCache;
}
