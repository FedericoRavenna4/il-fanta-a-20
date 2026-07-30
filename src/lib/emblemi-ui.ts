import type { Emblema, GruppoEmblema } from "./emblemi";

export const GRUPPI_EMBLEMI: GruppoEmblema[] = [
  "Base",
  "Comune",
  "Raro",
  "Epico",
  "Mitico",
  "Leggendario",
  "Da difendere",
];

export const NOMI_EMBLEMI_NASCOSTI = new Set([
  "primo scambio",
  "salvezza raggiunta",
  "senza paura",
  "schiacciasassi",
  "eroico",
  "goleador",
  "dieci e lode",
  "rosa perfetta",
]);

export function isEmblemaNascosto(emblema: Pick<Emblema, "nome">) {
  return NOMI_EMBLEMI_NASCOSTI.has(emblema.nome.trim().toLocaleLowerCase("it"));
}

export const PALETTE_EMBLEMI: Record<GruppoEmblema, {
  label: string;
  border: string;
  glow: string;
  glowStrong: string;
  line: string;
  ring: string;
}> = {
  Base: {
    label: "Base",
    border: "border-sky-300/70",
    glow: "bg-sky-400/20",
    glowStrong: "shadow-[0_18px_42px_rgba(14,165,233,.18)]",
    line: "from-sky-400/80",
    ring: "ring-sky-400/35",
  },
  Comune: {
    label: "Comune",
    border: "border-amber-700/45",
    glow: "bg-amber-700/23",
    glowStrong: "shadow-[0_18px_42px_rgba(146,64,14,.18)]",
    line: "from-amber-700/80",
    ring: "ring-amber-700/35",
  },
  Raro: {
    label: "Raro",
    border: "border-slate-400/65",
    glow: "bg-slate-400/25",
    glowStrong: "shadow-[0_18px_42px_rgba(100,116,139,.2)]",
    line: "from-slate-400/90",
    ring: "ring-slate-400/40",
  },
  Epico: {
    label: "Epico",
    border: "border-amber-400/75",
    glow: "bg-amber-400/24",
    glowStrong: "shadow-[0_18px_42px_rgba(245,158,11,.2)]",
    line: "from-amber-400/90",
    ring: "ring-amber-400/40",
  },
  Mitico: {
    label: "Mitico",
    border: "border-rose-600/55",
    glow: "bg-rose-600/23",
    glowStrong: "shadow-[0_18px_42px_rgba(225,29,72,.2)]",
    line: "from-rose-600/85",
    ring: "ring-rose-600/35",
  },
  Leggendario: {
    label: "Leggendario",
    border: "border-emerald-600/55",
    glow: "bg-emerald-500/24",
    glowStrong: "shadow-[0_18px_42px_rgba(5,150,105,.2)]",
    line: "from-emerald-500/90",
    ring: "ring-emerald-500/35",
  },
  "Da difendere": {
    label: "Da difendere",
    border: "border-violet-600/55",
    glow: "bg-violet-600/24",
    glowStrong: "shadow-[0_18px_42px_rgba(124,58,237,.22)]",
    line: "from-violet-600/90",
    ring: "ring-violet-600/35",
  },
};

export function descrizioneConRecord(emblema: Pick<Emblema, "descrizione" | "record" | "tipo">) {
  const descrizione = emblema.descrizione?.trim() ?? "";
  const record = emblema.record?.trim();
  if (emblema.tipo !== "Difendibile") {
    return descrizione;
  }

  const testo = descrizione && !/[.!?]$/.test(descrizione) ? `${descrizione}.` : descrizione;
  const valoreRecord = !record || record.toUpperCase() === "ND" ? "N/D" : record;
  return `${testo}${testo ? " " : ""}RECORD: ${valoreRecord}`;
}
