"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { OnboardingTeam } from "@/lib/account/onboarding";
import ProfileSupportSelector from "./ProfileSupportSelector";
import { requestProfileVerificationAction } from "./verification-actions";

export type { OnboardingTeam } from "@/lib/account/onboarding";
type Step = "choice" | "verify" | "support-warning" | "support";
type LeagueFilter = "all" | "a" | "b" | "ca" | "cb" | "cc";

const leagueFilters: { value: LeagueFilter; label: string }[] = [
  { value: "all", label: "Tutte" }, { value: "a", label: "A" }, { value: "b", label: "B" },
  { value: "ca", label: "C/A" }, { value: "cb", label: "C/B" }, { value: "cc", label: "C/C" },
];

function matchesLeague(team: OnboardingTeam, filter: LeagueFilter) {
  if (filter === "all") return true;
  if (filter === "a") return team.category === "Serie A";
  if (filter === "b") return team.category === "Serie B";
  return team.category === "Serie C" && team.group?.toLocaleUpperCase("it-IT") === filter.at(-1)?.toUpperCase();
}

export default function ProfileOnboarding({ seasonId, seasonCode, teams, rejected }: { seasonId: number; seasonCode: string; teams: OnboardingTeam[]; rejected: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLElement>(null);
  const [step, setStep] = useState<Step>("choice");
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [state, action, pending] = useActionState(requestProfileVerificationAction, { message: "" });
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("it-IT");
    return teams.filter((team) => matchesLeague(team, league) && (!needle || team.name.toLocaleLowerCase("it-IT").includes(needle))).slice(0, 20);
  }, [league, query, teams]);

  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  useEffect(() => { dialog.current?.focus(); }, [step]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault();
      if (event.key !== "Tab" || step === "support") return;
      const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step]);
  if (state.success) return null;

  return <div data-profile-onboarding data-global-onboarding role="dialog" aria-modal="true" aria-label="Completa il tuo profilo Fanta a 20" className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/70 p-2 backdrop-blur-sm sm:p-3"><section ref={dialog} tabIndex={-1} className="relative flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none">
    <header className="shrink-0 bg-gradient-to-r from-blue-950 to-blue-800 px-4 py-3 text-white sm:px-7 sm:py-5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300 sm:text-[10px]">Profilo Fanta a 20</p><h2 className="mt-0.5 text-lg font-black sm:mt-1 sm:text-3xl">{step === "choice" ? "Sei già tra le 100 società Fanta a 20?" : step === "verify" ? "Verifica il tuo profilo" : step === "support-warning" ? "Prima di scegliere" : "Scegli la tua squadra"}</h2></header>
    {step === "choice" && <div data-onboarding-choice className="space-y-3 p-4 sm:p-7">{rejected && <div data-verification-rejected className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"><strong className="block uppercase">Verifica non confermata</strong>Puoi riprovare oppure scegliere una squadra da tifare.</div>}<button type="button" onClick={() => setStep("verify")} className="min-h-12 w-full rounded-xl bg-blue-950 px-4 text-xs font-black uppercase text-white">Sì, verifica il profilo</button><button type="button" onClick={() => setStep("support-warning")} className="min-h-12 w-full rounded-xl border border-sky-300 bg-sky-50 px-4 text-xs font-black uppercase text-blue-950">No, scegli una squadra da tifare</button></div>}
    {step === "verify" && <form action={action} data-verification-form className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-4 sm:gap-4 sm:p-7">
      <p className="text-xs font-semibold leading-5 text-slate-600 sm:text-sm sm:leading-6">Richiedi la verifica della società che gestisci nel Fanta a 20. La richiesta sarà approvata soltanto dopo una conferma degli amministratori.</p>
      <div className="grid shrink-0 gap-2 sm:grid-cols-2 sm:gap-3"><label className="text-[10px] font-black uppercase text-blue-950 sm:text-xs">Nome<input name="nome" required minLength={2} maxLength={80} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold normal-case sm:h-11" /></label><label className="text-[10px] font-black uppercase text-blue-950 sm:text-xs">Cognome<input name="cognome" required minLength={2} maxLength={80} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold normal-case sm:h-11" /></label></div>
      <label className="block shrink-0 text-[10px] font-black uppercase text-blue-950 sm:text-xs">Cerca la tua società<input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedTeamId(null); }} placeholder="Nome società" className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold normal-case sm:h-11" /></label>
      <div data-verification-league-filter className="flex shrink-0 gap-1 overflow-x-auto pb-1">{leagueFilters.map((filter) => <button key={filter.value} type="button" aria-pressed={league === filter.value} onClick={() => { setLeague(filter.value); setSelectedTeamId(null); }} className={`min-h-8 shrink-0 rounded-full px-2.5 text-[9px] font-black uppercase ${league === filter.value ? "bg-blue-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>{filter.label}</button>)}</div>
      <input type="hidden" name="societaId" value={selectedTeamId ?? ""} />
      <div data-verification-search-results className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">{results.map((team) => <button key={team.id} type="button" aria-pressed={selectedTeamId === team.id} onClick={() => setSelectedTeamId(team.id)} className={`flex w-full items-center gap-2 rounded-xl border p-1.5 text-left sm:gap-3 sm:p-2 ${selectedTeamId === team.id ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}><Image src={team.logo} alt="" width={38} height={38} className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" /><span className="min-w-0"><strong className="block truncate text-xs text-blue-950 sm:text-sm">{team.name}</strong><span className="block truncate text-[9px] font-bold text-slate-500 sm:text-[10px]">{team.category}{team.group ? ` · Girone ${team.group}` : ""}</span></span></button>)}</div>
      {state.message && !state.success && <p role="alert" className="shrink-0 text-xs font-bold text-rose-700 sm:text-sm">{state.message}</p>}
      <div className="grid shrink-0 grid-cols-2 gap-2"><button type="button" onClick={() => setStep("choice")} className="min-h-10 rounded-xl border border-slate-300 text-[10px] font-black uppercase text-blue-950 sm:min-h-11 sm:text-xs">Torna indietro</button><button disabled={pending || selectedTeamId === null} className="min-h-10 rounded-xl bg-blue-950 px-3 text-[10px] font-black uppercase text-white disabled:opacity-50 sm:min-h-11 sm:text-xs">Invia richiesta</button></div>
    </form>}
    {step === "support-warning" && <div data-support-warning-step className="space-y-4 p-4 sm:space-y-5 sm:p-7"><p className="text-sm font-semibold leading-6 text-slate-600">La squadra che sceglierai da tifare non potrà essere cambiata durante la stagione. Scegli con cura e con il cuore: ogni scelta pesa, così come ogni traguardo della squadra che deciderai di sostenere.</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStep("choice")} className="min-h-11 rounded-xl border border-slate-300 text-[10px] font-black uppercase text-blue-950 sm:text-xs">Torna indietro</button><button type="button" onClick={() => setStep("support")} className="min-h-11 rounded-xl bg-blue-950 text-[10px] font-black uppercase text-white sm:text-xs">Procedi</button></div></div>}
    {step === "support" && <ProfileSupportSelector seasonId={seasonId} seasonCode={seasonCode} teams={teams} initiallyOpen lockedOpen />}
  </section></div>;
}

export function PendingVerification({ team, createdAt }: { team: Pick<OnboardingTeam, "name" | "logo">; createdAt: string }) {
  return <section data-verification-pending className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-sky-700">In attesa di conferma</p><div className="mt-3 flex items-center gap-3"><Image src={team.logo} alt="" width={56} height={56} className="h-14 w-14 object-contain" /><div><strong className="text-lg text-blue-950">{team.name}</strong><p className="text-xs font-semibold leading-5 text-slate-600">La richiesta è stata registrata ed è in attesa del controllo degli amministratori.</p><time className="text-[10px] font-bold text-slate-400" dateTime={createdAt}>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(createdAt))}</time></div></div></section>;
}
