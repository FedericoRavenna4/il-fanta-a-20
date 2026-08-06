export type ResolvedSocieta = {
  input: string;
  normalized: string;
  matches: Array<{ societaId: number; alias?: string; source?: string }>;
  societaId: number | null;
};

export type SocietaResolver = { resolve(name: string): ResolvedSocieta };

export type ParsedTeam = { name: string; normalized: string; societaId: number | null };

export type ParsedMatch = {
  source: { sheet: string; row: number };
  edizioneCompetizioneId: number | null;
  giornataLega: number;
  giornataSerieA: number | null;
  fase: string | null;
  girone: string | null;
  raggruppamento: string | null;
  casa: ParsedTeam;
  trasferta: ParsedTeam;
  fantapuntiCasa: number | null;
  fantapuntiTrasferta: number | null;
  golCasa: number | null;
  golTrasferta: number | null;
  stato: "programmata" | "calcolata";
  placeholdersIgnorati: boolean;
};

export type ParsedRest = {
  source: { sheet: string; row: number };
  edizioneCompetizioneId: number | null;
  giornataLega: number;
  giornataSerieA: number | null;
  fase: string | null;
  girone: string | null;
  raggruppamento: string | null;
  societa: ParsedTeam;
};

export type CalendarParseResult = {
  workbook: { sheetNames: string[]; sheetName: string; range: string | null; rows: number; columns: number };
  layout: { type: string; headerRows: number[] };
  days: number[];
  phases: string[];
  matches: ParsedMatch[];
  rests: ParsedRest[];
  diagnostics: {
    unknownNames: string[];
    ambiguousNames: string[];
    duplicates: unknown[];
    restDuplicates: unknown[];
    incompleteRows: Array<{ sheet: string; row: number; giornataLega: number; casa: string | null; trasferta: string | null }>;
    incompleteDays: Array<{ day: number }>;
    uninterpretableValues: string[];
    anomalies: unknown[];
  };
};

export function normalizeSocietaName(value: unknown): string;
export function createProjectSocietaResolver(root?: string): SocietaResolver;
export function parseCalendarBuffer(buffer: Buffer | Uint8Array, options?: { resolver?: SocietaResolver; expectedDays?: number | null; edizioneCompetizioneId?: number; sheetName?: string }): CalendarParseResult;
export function parseCalendarWorkbook(filePath: string, options?: { resolver?: SocietaResolver; expectedDays?: number | null; edizioneCompetizioneId?: number; sheetName?: string }): CalendarParseResult;
export function buildUpsertPayload(parsed: CalendarParseResult, options: { edizioneCompetizioneId: number; fonteImportazione?: string; importBatchId?: string }): Array<Record<string, unknown>>;
export function buildRestsUpsertPayload(parsed: CalendarParseResult, options: { edizioneCompetizioneId: number }): Array<Record<string, unknown>>;
export function classifyUpsertChanges(payload: Array<Record<string, unknown>>, existingRows: Array<Record<string, unknown>>): { insert: Array<Record<string, unknown>>; update: Array<Record<string, unknown>>; unchanged: Array<Record<string, unknown>> };
