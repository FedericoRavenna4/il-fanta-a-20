export type ImportType = "calendario_campionato" | "calendario_coppa" | "rose";
export type ChangeKind = "insert" | "update" | "unchanged" | "warning" | "error";

export type AdminAccess = { allowed: boolean; canPublish: boolean; mode: "denied" | "development" | "authenticated"; email: string | null; username: string; userId: string | null; reason: string };

export type ImportIssue = { codice: string; messaggio: string; riga?: number; valore?: string };

export type ImportChange = {
  kind: ChangeKind;
  entity: "partita" | "riposo" | "rosa";
  giornata?: number;
  title: string;
  detail: string[];
};

export type ImportPreview = {
  importId: string;
  developmentOnly: boolean;
  publishEnabled: boolean;
  fileName: string;
  fileHash: string;
  seasonLabel: string;
  competitionLabel: string;
  competitionCode: string;
  targetLeagueCode?: string;
  importType: ImportType;
  summary: {
    giornate: number;
    partite: number;
    riposi: number;
    societaRiconosciute: number;
    societaNonRiconosciute: string[];
    insert: number;
    update: number;
    unchanged: number;
    existing: number;
    replace: number;
    warning: number;
    error: number;
    calciatori?: number;
    trasferimenti?: number;
    rimossi?: number;
  };
  changes: ImportChange[];
  warnings: ImportIssue[];
  errors: ImportIssue[];
  roseRows?: Array<{ societa: string; giocatore: string; squadraReale: string | null; ruolo: string; prezzo: number; stato: string }>;
};

export type ActionResult = { ok: true; preview: ImportPreview } | { ok: false; message: string };

export type AdminCatalog = {
  seasons: Array<{ id: string; label: string }>;
  competitions: Array<{
    edizioneCompetizioneId: string;
    seasonId: string;
    competitionId: string;
    code: string;
    label: string;
    importType: ImportType;
  }>;
};

export type ImportHistoryItem = {
  id: string;
  createdAt: string;
  type: string;
  competition: string;
  season: string;
  fileName: string;
  status: string;
  inserted: number;
  updated: number;
  total: number;
  warnings: number;
  errors: number;
  summary: unknown;
  warningItems: unknown[];
  errorItems: unknown[];
};
