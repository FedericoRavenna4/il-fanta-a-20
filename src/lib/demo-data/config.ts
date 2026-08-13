export const DEFAULT_DEMO_SEED = 20260813;

export function isGlobalFakeDataEnabled(environment: { NODE_ENV?: string; F20_FAKE_DATA?: string } = process.env) {
  return environment.NODE_ENV !== "production" && environment.F20_FAKE_DATA?.trim().toLowerCase() === "true";
}

export function getDemoSeed(value = process.env.F20_DEMO_SEED) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : DEFAULT_DEMO_SEED;
}
