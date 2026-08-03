import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const logoDir = path.join(root, "public", "societa");
const migrationPath = path.join(root, "supabase", "migrations", "202608030001_societa_registry.sql");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim()); value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim()); value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function normalizeName(value) {
  return String(value ?? "")
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function sql(value) {
  return value === null || value === undefined || value === ""
    ? "null"
    : `'${String(value).replaceAll("'", "''")}'`;
}

function isYes(value) {
  return normalizeName(value) === "si";
}

function badgeType(row) {
  return [
    isYes(row.Badge_New_Entry) && "new_entry",
    isYes(row.Badge_Neopromossa) && "neo_promossa",
    isYes(row.Badge_Campione_Serie_A) && "campione_in_carica",
  ].filter(Boolean).join(",") || null;
}

const societa = readCsv("societa.csv");
const storie = readCsv("storie_societa.csv");
const masterIds = new Set(societa.map((row) => Number(row.ID_Squadra)).filter(Number.isInteger));
const aliasSources = [
  ["storie_societa.csv", storie, "Squadra_ID", "Nome_Societa", "storia"],
  ["societa_emblemi.csv", readCsv("societa_emblemi.csv"), "ID_Squadra", "Nome_Società", "emblemi"],
  ["ranking.csv", readCsv("ranking.csv"), "Squadra_ID", "Nome_Ranking", "ranking"],
  ["sala_trofei.csv", readCsv("sala_trofei.csv"), "Squadra_ID", "Nome_Squadra", "sala_trofei"],
  ["risultati.csv", readCsv("risultati.csv"), "Squadra_ID", "Nome_Storico", "risultati_storici"],
];
const storyById = new Map(storie.map((row) => [Number(row.Squadra_ID), row["Descrizione Storia"]]));
const aliases = new Map();
const logos = fs.readdirSync(logoDir);

function addAlias(societaId, alias, fonte) {
  const normalized = normalizeName(alias);
  if (!societaId || !masterIds.has(societaId) || !normalized) return;
  if (fonte !== "societa.nome_ufficiale") {
    const master = societa.find((row) => Number(row.ID_Squadra) === societaId);
    const forbiddenValues = [
      master?.Squadra_Reale,
      master?.Nickname_Instagram,
      master?.Fantallenatore,
    ].map(normalizeName).filter(Boolean);
    if (forbiddenValues.includes(normalized)) return;
  }
  const key = `${societaId}:${normalized}`;
  if (!aliases.has(key)) aliases.set(key, { societaId, alias: String(alias).trim(), fonte });
}

for (const row of societa) {
  const id = Number(row.ID_Squadra);
  addAlias(id, row["Nome_Società"], "societa.nome_ufficiale");
}
for (const [, rows, idColumn, nameColumn, fonte] of aliasSources) {
  for (const row of rows) addAlias(Number(row[idColumn]), row[nameColumn], fonte);
}

const header = `-- Generated from the repository CSV files by scripts/generate-societa-migration.mjs\n-- Do not execute automatically: review the accompanying audit first.\n\nbegin;\n\ncreate extension if not exists unaccent with schema extensions;\n\ncreate or replace function public.normalize_societa_name(input text)\nreturns text\nlanguage sql\nimmutable\nstrict\nset search_path = ''\nas $$\n  select trim(\n    regexp_replace(\n      regexp_replace(\n        regexp_replace(\n          lower(extensions.unaccent(input)),\n          '[''’‘\u0060´]', '', 'g'\n        ),\n        '[-‐‑‒–—_/.]+', ' ', 'g'\n      ),\n      '[[:space:]]+', ' ', 'g'\n    )\n  );\n$$;\n\ncreate table public.societa (\n  id integer primary key,\n  nome_ufficiale text not null,\n  nome_personalizzato text null,\n  nome_normalizzato text not null unique,\n  squadra_associata text null,\n  fantallenatore text null,\n  nickname_instagram text null,\n  stagione_ingresso text null,\n  categoria text null,\n  girone text null,\n  logo_path text null,\n  storia text null,\n  badge_tipo text null,\n  attiva boolean not null default true,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  constraint societa_nome_normalizzato_coerente\n    check (nome_normalizzato = public.normalize_societa_name(coalesce(nome_personalizzato, nome_ufficiale)))\n);\n\ncreate table public.societa_alias (\n  id bigint generated by default as identity primary key,\n  societa_id integer not null references public.societa(id) on delete cascade,\n  alias text not null,\n  alias_normalizzato text not null,\n  fonte text null,\n  created_at timestamptz not null default now(),\n  constraint societa_alias_normalizzato_coerente\n    check (alias_normalizzato = public.normalize_societa_name(alias)),\n  constraint societa_alias_societa_normalizzato_unique unique (societa_id, alias_normalizzato)\n);\n\ncreate index societa_alias_alias_normalizzato_idx\n  on public.societa_alias (alias_normalizzato);\n\ncreate or replace function public.set_societa_updated_at()\nreturns trigger\nlanguage plpgsql\nsecurity invoker\nset search_path = ''\nas $$\nbegin\n  new.updated_at = now();\n  return new;\nend;\n$$;\n\ncreate trigger societa_set_updated_at\nbefore update on public.societa\nfor each row execute function public.set_societa_updated_at();\n\nalter table public.societa enable row level security;\nalter table public.societa_alias enable row level security;\n\nrevoke all on public.societa from anon, authenticated;\nrevoke all on public.societa_alias from anon, authenticated;\ngrant select on public.societa to anon, authenticated;\ngrant select on public.societa_alias to anon, authenticated;\n\ncreate policy societa_public_read_active\non public.societa for select\nto anon, authenticated\nusing (attiva = true);\n\ncreate policy societa_alias_public_read_active\non public.societa_alias for select\nto anon, authenticated\nusing (exists (\n  select 1 from public.societa s\n  where s.id = societa_alias.societa_id and s.attiva = true\n));\n\n`;

const companyRows = societa.map((row) => {
  const id = Number(row.ID_Squadra);
  const officialName = row["Nome_Società"];
  const prefix = `${String(id).padStart(3, "0")}_`;
  const resolvedLogo = logos.find((file) => file.toLocaleLowerCase("it") === row.Logo.toLocaleLowerCase("it")) ??
    logos.find((file) => file.startsWith(prefix)) ?? null;
  return `  (${id}, ${sql(officialName)}, null, public.normalize_societa_name(${sql(officialName)}), ${sql(row.Squadra_Reale)}, ${sql(row.Fantallenatore === "-" ? null : row.Fantallenatore)}, ${sql(row.Nickname_Instagram === "-" ? null : row.Nickname_Instagram)}, ${sql(row.Stagione_Ingresso)}, ${sql(row.Lega_Attuale.trim())}, ${sql(row.Girone === "-" ? null : row.Girone)}, ${sql(resolvedLogo ? `/societa/${resolvedLogo}` : null)}, ${sql(storyById.get(id) ?? null)}, ${sql(badgeType(row))}, true)`;
});

const aliasRows = [...aliases.values()].sort((a, b) => a.societaId - b.societaId || a.alias.localeCompare(b.alias, "it")).map(({ societaId, alias, fonte }) =>
  `  (${societaId}, ${sql(alias)}, public.normalize_societa_name(${sql(alias)}), ${sql(fonte)})`
);

const seed = `insert into public.societa (\n  id, nome_ufficiale, nome_personalizzato, nome_normalizzato, squadra_associata,\n  fantallenatore, nickname_instagram, stagione_ingresso, categoria, girone,\n  logo_path, storia, badge_tipo, attiva\n) values\n${companyRows.join(",\n")};\n\ninsert into public.societa_alias (societa_id, alias, alias_normalizzato, fonte) values\n${aliasRows.join(",\n")};\n\ncommit;\n`;

const normalizedHeader = header.replace(
  /as \$\$\n  select trim\([\s\S]*?\n\$\$;/,
  () => "as $$\n  select regexp_replace(lower(extensions.unaccent(input)), '[^a-z0-9]+', '', 'g');\n$$;"
);
fs.writeFileSync(migrationPath, normalizedHeader + seed, "utf8");

const duplicateIds = [...new Set(societa.map((row) => Number(row.ID_Squadra)).filter((id, index, ids) => ids.indexOf(id) !== index))];
const withoutId = societa.filter((row) => !Number.isInteger(Number(row.ID_Squadra))).map((row) => row["Nome_Società"] || "(senza nome)");
const normalizedNames = new Map();
for (const row of societa) {
  const normalized = normalizeName(row["Nome_Società"]);
  const entries = normalizedNames.get(normalized) ?? [];
  entries.push({ id: Number(row.ID_Squadra), name: row["Nome_Società"] });
  normalizedNames.set(normalized, entries);
}
const duplicateNames = [...normalizedNames.entries()].filter(([, entries]) => entries.length > 1)
  .map(([normalized, entries]) => ({ normalized, entries }));
const aliasesByNormalized = new Map();
for (const entry of aliases.values()) {
  const normalized = normalizeName(entry.alias);
  const ids = aliasesByNormalized.get(normalized) ?? new Set();
  ids.add(entry.societaId);
  aliasesByNormalized.set(normalized, ids);
}
const ambiguousAliases = [...aliasesByNormalized.entries()]
  .filter(([, ids]) => ids.size > 1)
  .map(([normalized, ids]) => ({ normalized, ids: [...ids].sort((a, b) => a - b) }));
const forbiddenAliasMatches = [...aliases.values()].filter((entry) => {
  if (entry.fonte === "societa.nome_ufficiale") return false;
  const master = societa.find((row) => Number(row.ID_Squadra) === entry.societaId);
  return [master?.Squadra_Reale, master?.Nickname_Instagram, master?.Fantallenatore]
    .map(normalizeName)
    .filter(Boolean)
    .includes(normalizeName(entry.alias));
});
const logoChecks = societa.map((row) => {
  const id = Number(row.ID_Squadra);
  const exact = logos.find((file) => file.toLocaleLowerCase("it") === row.Logo.toLocaleLowerCase("it"));
  const prefix = `${String(id).padStart(3, "0")}_`;
  const matches = logos.filter((file) => file.startsWith(prefix));
  return { id, csv: row.Logo, resolved: exact ?? matches[0] ?? null, exact: Boolean(exact), matches };
});
const referencedLogoFiles = new Set(logoChecks.map((entry) => entry.resolved).filter(Boolean));
const orphanLogos = logos.filter((file) => !referencedLogoFiles.has(file));
const sourceCoverage = aliasSources.slice(0, 2).map(([fileName, rows, idColumn]) => {
  const ids = new Set(rows.map((row) => Number(row[idColumn])).filter(Number.isInteger));
  return {
    file: fileName,
    missingFromSource: [...masterIds].filter((id) => !ids.has(id)),
    unknownInSource: [...ids].filter((id) => !masterIds.has(id)),
    duplicateIds: [...new Set(rows.map((row) => Number(row[idColumn])).filter((id, index, all) => all.indexOf(id) !== index))],
  };
});
const unknownReferences = aliasSources.map(([fileName, rows, idColumn]) => ({
  file: fileName,
  ids: [...new Set(rows.map((row) => Number(row[idColumn])).filter((id) => Number.isInteger(id) && !masterIds.has(id)))],
})).filter((entry) => entry.ids.length);
const nameDifferences = aliasSources.slice(0, 4).flatMap(([fileName, rows, idColumn, nameColumn]) =>
  rows.flatMap((row) => {
    const master = societa.find((candidate) => Number(candidate.ID_Squadra) === Number(row[idColumn]));
    if (!master || !row[nameColumn] || row[nameColumn] === master["Nome_Società"]) return [];
    return [{
      file: fileName,
      id: Number(row[idColumn]),
      master: master["Nome_Società"],
      source: row[nameColumn],
      normalizationEquivalent: normalizeName(master["Nome_Società"]) === normalizeName(row[nameColumn]),
    }];
  })
);

console.log(JSON.stringify({
  migrationPath,
  societa: societa.length,
  aliases: aliasRows.length,
  duplicateIds,
  withoutId,
  duplicateNames,
  ambiguousAliases,
  forbiddenAliasMatches,
  missingLogos: logoChecks.filter((entry) => !entry.resolved),
  logoNameFallbacks: logoChecks.filter((entry) => entry.resolved && !entry.exact),
  duplicateLogoPrefixes: logoChecks.filter((entry) => entry.matches.length > 1),
  orphanLogos,
  sourceCoverage,
  unknownReferences,
  nameDifferences,
}, null, 2));
