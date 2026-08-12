"use client";

import { useState } from "react";
import type { OnboardingTeam } from "@/lib/account/onboarding";
import ProfileOnboarding from "./ProfileOnboarding";

export default function ProfilePathActions({ seasonId, seasonCode, teams, rejected }: { seasonId: number; seasonCode: string; teams: OnboardingTeam[]; rejected: boolean }) {
  const [open, setOpen] = useState(false);
  return <div data-profile-path-actions>
    {rejected && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="text-sm font-black uppercase text-amber-950">Verifica non confermata</strong><p className="mt-1 text-sm font-semibold text-amber-900">Puoi riprovare la verifica oppure scegliere una squadra da tifare.</p></div>}
    <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 w-full rounded-xl bg-blue-950 px-4 text-xs font-black uppercase text-white">{rejected ? "Riprova la verifica o scegli il Tifo" : "Scegli il tuo percorso"}</button>
    {open && <ProfileOnboarding seasonId={seasonId} seasonCode={seasonCode} teams={teams} rejected={rejected} />}
  </div>;
}
