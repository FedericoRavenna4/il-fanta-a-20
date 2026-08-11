import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const FIELDS = ["nome", "fantallenatore", "categoria", "girone", "logo", "stagione_ingresso"];

function parseCsvLine(line) {
  return line.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/).map((value) => value.replace(/^\"|\"$/g, "").trim());
}

function nullable(value) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function logoFilename(value) {
  const normalized = nullable(value);
  return normalized ? normalized.replaceAll("\\", "/").split("/").at(-1) : null;
}

export function parseSocietaCsv(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const row = parseCsvLine(line);
    return {
      id: Number(row[0]),
      nome: row[1],
      fantallenatore: nullable(row[2]),
      categoria: nullable(row[6]),
      girone: nullable(row[7]),
      logo: logoFilename(row[11]),
      stagione_ingresso: nullable(row[5]),
    };
  });
}

export function mapDatabaseSocieta(row) {
  return {
    id: Number(row.id),
    nome: row.nome_personalizzato ?? row.nome_ufficiale,
    fantallenatore: nullable(row.fantallenatore),
    categoria: nullable(row.categoria),
    girone: nullable(row.girone),
    logo: logoFilename(row.logo_path),
    stagione_ingresso: nullable(row.stagione_ingresso),
  };
}

export function compareSocietaSources(databaseRows, csvRows) {
  const database = new Map(databaseRows.map((row) => [row.id, row]));
  const csv = new Map(csvRows.map((row) => [row.id, row]));
  const ids = [...new Set([...database.keys(), ...csv.keys()])].sort((a, b) => a - b);
  const differences = [];
  for (const id of ids) {
    const dbRow = database.get(id);
    const csvRow = csv.get(id);
    if (!dbRow || !csvRow) {
      differences.push({ id, field: "record", database: dbRow ?? null, csv: csvRow ?? null });
      continue;
    }
    for (const field of FIELDS) {
      if (dbRow[field] !== csvRow[field]) differences.push({ id, field, database: dbRow[field], csv: csvRow[field] });
    }
  }
  return differences;
}

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Configurazione pubblica Supabase non disponibile.");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("societa").select("id,nome_ufficiale,nome_personalizzato,fantallenatore,categoria,girone,logo_path,stagione_ingresso").order("id");
  if (error) throw new Error(`Audit società: ${error.message}`);

  const csvText = fs.readFileSync(path.join(process.cwd(), "data", "societa.csv"), "utf8");
  const differences = compareSocietaSources((data ?? []).map(mapDatabaseSocieta), parseSocietaCsv(csvText));
  if (differences.length === 0) {
    console.log("Nessuna divergenza DB/CSV rilevata.");
    return;
  }
  console.table(differences);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
