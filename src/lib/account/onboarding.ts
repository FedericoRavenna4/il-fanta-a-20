export type OnboardingTeam = {
  id: number;
  name: string;
  logo: string;
  league: string;
  category: string;
  group: string | null;
  ranking: number;
  trophies: number;
  emblemsUnlocked: number;
  emblemsTotal: number;
  emblemsDefending: number;
  story: string;
};
