import { isOfficialAccount } from "@/lib/account/hub";

export const OFFICIAL_ACCOUNT_LABEL = "Partecipante ufficiale Fanta a 20";

export default function OfficialAccountBadge({ societaId, className = "" }: { societaId: number | null; className?: string }) {
  if (!isOfficialAccount(societaId)) return null;
  return <span role="img" aria-label={OFFICIAL_ACCOUNT_LABEL} title={OFFICIAL_ACCOUNT_LABEL} className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 via-sky-500 to-blue-700 text-white shadow-[0_4px_12px_rgba(14,165,233,.3)] ring-2 ring-white/25 sm:h-7 sm:w-7 ${className}`}><svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none"><path d="m5.5 10.2 2.8 2.8 6.2-6.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}
