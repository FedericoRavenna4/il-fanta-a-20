export type VerificationStatus = "pending" | "approved" | "rejected";

export function shouldShowProfileOnboarding(input: {
  owner: boolean;
  societaId: number | null;
  hasActiveSupport: boolean;
  hasPendingVerification: boolean;
}) {
  return input.owner
    && input.societaId === null
    && !input.hasActiveSupport
    && !input.hasPendingVerification;
}
