export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = new Set(["xlsx", "xls", "csv"]);
const MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "text/csv",
  "text/plain",
  "",
]);

export type ImportFileLike = { name: string; size: number; type: string };

export function validateImportFile<T extends ImportFileLike>(file: T | null): T {
  if (!file || file.size === 0) throw new Error("Seleziona un file CSV o Excel non vuoto.");
  if (!file.name.trim()) throw new Error("Il file deve avere un nome valido.");
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("it") ?? "";
  if (!EXTENSIONS.has(extension)) throw new Error("Formato non valido: sono ammessi file .csv, .xlsx e .xls.");
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("Il file supera il limite massimo di 10 MB.");
  if (!MIME_TYPES.has(file.type.toLocaleLowerCase("it"))) throw new Error("MIME type del file non riconosciuto.");
  return file;
}
