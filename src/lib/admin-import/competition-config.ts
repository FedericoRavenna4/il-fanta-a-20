export type CompetitionImportConfig = {
  code: string;
  family: "coppe";
  expectedStructure?: { days: number; matches: number; teams: number; label: string };
};

const configs: Record<string, CompetitionImportConfig> = {
  "coppa-fanta-20": {
    code: "coppa-fanta-20",
    family: "coppe",
    expectedStructure: { days: 14, matches: 700, teams: 100, label: "Calendario ufficiale · 14 giornate · 700 partite · 100 società" },
  },
};

export function getCompetitionImportConfig(code: string | null | undefined) {
  return code ? configs[code] : undefined;
}
