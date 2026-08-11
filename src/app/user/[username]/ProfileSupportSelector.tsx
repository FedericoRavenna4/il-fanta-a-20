"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { selectSupportedTeamAction } from "@/app/account/support-actions";
import type { OnboardingTeam as TeamOption } from "@/lib/account/onboarding";

type SortMode = "ranking" | "trophies" | "name";
const leagues = ["Serie A", "Serie B", "Serie C Girone A", "Serie C Girone B", "Serie C Girone C"];

function Confetti() {
  return <div data-support-confetti aria-hidden="true" className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">{Array.from({ length: 28 }, (_, index) => <i key={index} className="absolute -top-4 h-3 w-2 animate-[support-confetti_1.35s_ease-out_forwards] rounded-sm motion-reduce:hidden" style={{ left: `${(index * 37) % 100}%`, backgroundColor: ["#38bdf8", "#f59e0b", "#1e3a8a", "#f8fafc"][index % 4], animationDelay: `${(index % 7) * 45}ms`, transform: `rotate(${index * 29}deg)` }} />)}</div>;
}

function SupportTeamName({ name }: { name: string }) {
  const viewport = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const container = viewport.current;
    const text = measure.current;
    if (!container || !text) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setDistance(motion.matches ? 0 : Math.max(0, Math.ceil(text.scrollWidth - container.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(text);
    motion.addEventListener("change", update);
    return () => { observer.disconnect(); motion.removeEventListener("change", update); };
  }, [name]);

  const style = distance > 0 ? ({ "--support-name-distance": `${distance}px`, "--support-name-duration": `${Math.min(10, Math.max(6, 6 + distance / 24))}s` } as CSSProperties) : undefined;
  return <span ref={viewport} title={name} aria-label={name} className="relative block min-w-0 overflow-hidden text-center uppercase"><span ref={measure} aria-hidden="true" className="pointer-events-none absolute invisible min-w-max whitespace-nowrap">{name}</span>{distance > 0 ? <span style={style} aria-hidden="true" className="support-team-name-marquee block min-w-max whitespace-nowrap">{name}</span> : <span aria-hidden="true" className="line-clamp-2 lg:block lg:truncate lg:whitespace-nowrap">{name}</span>}</span>;
}

export default function ProfileSupportSelector({ seasonId, seasonCode, teams, initiallyOpen = false, lockedOpen = false }: { seasonId: number; seasonCode: string; teams: TeamOption[]; initiallyOpen?: boolean; lockedOpen?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(selectSupportedTeamAction, { message: "" });
  const [open, setOpen] = useState(initiallyOpen);
  const [selected, setSelected] = useState<TeamOption | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrated = useRef(false);
  const [league, setLeague] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("ranking");
  const filtered = useMemo(() => teams
    .filter((team) => (!league || team.league === league) && team.name.toLocaleLowerCase("it-IT").includes(query.trim().toLocaleLowerCase("it-IT")))
    .sort((a, b) => sort === "ranking" ? a.ranking - b.ranking || a.name.localeCompare(b.name, "it") : sort === "trophies" ? b.trophies - a.trophies || a.name.localeCompare(b.name, "it") : a.name.localeCompare(b.name, "it")), [league, query, sort, teams]);

  useEffect(() => {
    if (!state.success || celebrated.current) return;
    celebrated.current = true;
    setCelebrating(true);
    const timer = window.setTimeout(() => { setCelebrating(false); setSelected(null); setOpen(false); router.refresh(); }, 1400);
    return () => window.clearTimeout(timer);
  }, [router, state.success]);

  return <>
    {!initiallyOpen && <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/60 p-5 text-center"><p className="text-sm font-bold text-blue-950">Scegli la società da sostenere per tutta la stagione e vivi il suo percorso fino in fondo.</p><button type="button" onClick={() => setOpen(true)} className="mt-4 min-h-11 rounded-xl bg-blue-950 px-6 text-xs font-black uppercase text-white">Scegli la tua squadra</button></div>}
    {open && <div role="dialog" aria-modal="true" aria-label="Scegli la tua squadra" className="fixed inset-0 z-[125] bg-slate-950/70 p-2 backdrop-blur-sm sm:p-6"><section className="mx-auto flex h-full max-w-[96rem] flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"><header className="flex items-center justify-between bg-blue-950 px-4 py-3 text-white sm:px-7"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">Stagione {seasonCode}</p><h2 className="text-xl font-black uppercase sm:text-3xl">Scegli la tua squadra</h2></div>{!lockedOpen && <button type="button" onClick={() => { setOpen(false); setSelected(null); }} aria-label="Chiudi" className="h-10 w-10 rounded-full border border-white/20 text-xl">×</button>}</header>
      <div data-support-catalog-filters className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] gap-2 border-b border-slate-200 bg-white p-2 sm:grid-cols-[14rem_minmax(0,1fr)_16rem] sm:px-5 sm:py-3"><label className="text-[8px] font-black uppercase text-slate-500">Lega<select aria-label="Filtra per lega" value={league} onChange={(event) => setLeague(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-1 text-[10px] text-blue-950 sm:px-3 sm:text-xs"><option value="">Tutte</option>{leagues.map((value) => <option key={value}>{value}</option>)}</select></label><fieldset className="min-w-0"><legend className="text-[8px] font-black uppercase text-slate-500">Ordina</legend><div className="mt-1 grid h-9 grid-cols-3 rounded-lg bg-slate-100 p-0.5">{([['ranking', 'Ranking'], ['trophies', 'Trofei'], ['name', 'Nome']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setSort(value)} aria-pressed={sort === value} className={`min-w-0 truncate rounded-md px-1 text-[8px] font-black uppercase sm:text-[10px] ${sort === value ? "bg-white text-blue-950 shadow-sm" : "text-slate-500"}`}>{label}</button>)}</div></fieldset><label className="col-span-2 text-[8px] font-black uppercase text-slate-500 sm:col-span-1">Ricerca<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca società" className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[10px] outline-none focus:border-sky-500 sm:px-3 sm:text-xs" /></label></div>
      <div data-support-catalog-grid className="grid flex-1 auto-rows-max grid-cols-4 content-start items-start gap-2.5 overflow-y-auto overflow-x-hidden bg-slate-100/70 p-2 sm:p-4 lg:grid-cols-10 lg:gap-3">{filtered.map((team) => <button data-support-team-card key={team.id} type="button" onClick={() => setSelected(team)} aria-label={`Scopri ${team.name}`} className="group grid h-[10rem] min-h-[10rem] w-full min-w-0 grid-rows-[3.75rem_2.75rem_2.5rem] overflow-hidden rounded-xl border border-white/80 bg-[linear-gradient(155deg,rgba(255,255,255,1)_0%,rgba(248,251,255,.98)_58%,rgba(239,246,255,.82)_100%)] p-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,1),0_8px_20px_-14px_rgba(15,45,90,.45)] ring-1 ring-slate-200/70 transition-[transform,border-color,box-shadow] duration-200 hover:border-sky-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_12px_24px_-14px_rgba(15,45,90,.58)] lg:h-[10.5rem] lg:min-h-[10.5rem] lg:grid-rows-[5rem_2rem_2rem] lg:p-2 lg:hover:-translate-y-0.5 motion-reduce:transform-none"><span data-support-card-logo className="grid min-h-0 place-items-center overflow-hidden border-b border-white/70 drop-shadow-[0_3px_4px_rgba(15,23,42,.08)]"><Image src={team.logo} alt={`Logo ${team.name}`} width={72} height={72} className="h-12 w-12 max-h-full max-w-full object-contain lg:h-[4.25rem] lg:w-[4.25rem]" /></span><strong data-support-card-name className="min-w-0 self-center overflow-hidden border-b border-slate-200/70 px-0.5 py-1.5 text-[9px] font-black uppercase leading-[1.15] text-blue-950 lg:py-2 lg:text-[10px]"><SupportTeamName name={team.name} /></strong><span data-support-card-meta className="flex min-w-0 flex-col items-center justify-center gap-1 self-stretch overflow-hidden text-[8px] font-black uppercase leading-none text-slate-500 lg:flex-row lg:text-[8px]"><span className="truncate">#{team.ranking} Ranking</span><span aria-hidden="true" className="hidden text-orange-400 lg:inline">·</span><span className="truncate text-sky-700">{team.trophies} Trofei</span></span></button>)}</div>
    </section>
    {selected && <div data-support-team-dialog role="dialog" aria-modal="true" aria-label={`Conferma ${selected.name}`} className="absolute inset-0 z-10 grid place-items-center bg-slate-950/55 p-3"><section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/20 bg-white p-4 text-center shadow-2xl sm:p-7"><Image src={selected.logo} alt={`Logo ${selected.name}`} width={112} height={112} className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24" /><h3 className="mt-2 text-2xl font-black uppercase text-blue-950 sm:mt-3 sm:text-3xl">{selected.name}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-sky-700">{selected.league}{selected.group ? ` · Girone ${selected.group}` : ""}</p><p className="mx-auto mt-2 text-xs font-black text-slate-500">#{selected.ranking} Ranking · {selected.trophies} Trofei</p><p data-support-emblems className="mt-1 text-xs font-black uppercase text-blue-950">{selected.emblemsUnlocked}/{selected.emblemsTotal} Emblemi sbloccati</p>{selected.emblemsDefending > 0 && <p data-support-defending-emblems className="mt-1 text-[10px] font-black uppercase tracking-wider text-orange-600">{selected.emblemsDefending} da difendere</p>}<div data-support-full-story className="mt-3 rounded-2xl bg-slate-50 p-3 text-left sm:p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-sky-700">Storia</p><p className="mt-1 max-h-40 touch-pan-y overflow-y-auto overscroll-contain pr-1 text-xs font-semibold leading-5 text-slate-600 sm:max-h-56 sm:text-sm">{selected.story}</p></div><p className="mt-4 text-base font-black text-blue-950">Sei sicuro di voler scegliere {selected.name}?</p><p data-support-warning className="mt-1 break-words text-[9px] font-semibold text-slate-500 sm:text-[11px]">⚠️ La scelta resterà valida fino al termine della stagione e non potrà essere modificata.</p><form action={action} className="mt-4 grid gap-2 sm:grid-cols-2"><input type="hidden" name="stagioneId" value={seasonId} /><input type="hidden" name="societaId" value={selected.id} /><input type="hidden" name="confirmed" value="true" /><button data-support-confirm disabled={pending || state.success} className="min-h-11 rounded-xl bg-blue-950 px-5 text-xs font-black uppercase text-white disabled:opacity-50">CONFERMA!</button><button type="button" disabled={pending} onClick={() => setSelected(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-xs font-black uppercase text-blue-950">TORNA ALLA SELEZIONE</button></form>{state.message && !state.success && <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{state.message}</p>}</section></div>}
    </div>}
    {celebrating && <Confetti />}
    <style jsx global>{`@keyframes support-confetti { 0% { transform: translateY(-5vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(540deg); opacity: 0; } } @keyframes support-name-scroll { 0%, 18% { transform: translateX(0); } 70%, 86% { transform: translateX(calc(-1 * var(--support-name-distance))); } 100% { transform: translateX(0); } } .support-team-name-marquee { animation: support-name-scroll var(--support-name-duration) ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .support-team-name-marquee { animation: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; } }`}</style>
  </>;
}
