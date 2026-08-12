export type VerificationStatus = "pending" | "approved" | "rejected";
export type ProfileTeamState = "official" | "verification-pending" | "supported" | "verification-rejected" | "onboarding";

export function resolveProfileTeamState(input: {
  societaId: number | null;
  verificationStatus: VerificationStatus | null;
  hasActiveSupport: boolean;
}): ProfileTeamState {
  if (input.societaId !== null) return "official";
  if (input.verificationStatus === "pending") return "verification-pending";
  if (input.hasActiveSupport) return "supported";
  if (input.verificationStatus === "rejected") return "verification-rejected";
  return "onboarding";
}

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
