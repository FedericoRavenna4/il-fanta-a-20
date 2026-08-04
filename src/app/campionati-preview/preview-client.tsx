"use client";

import { useMemo, useState } from "react";
import type { LeagueId, LeagueMock } from "./types";
import { leagueHighlights, standingsFor } from "./mock-logic";
import { LeagueSelector, MatchCard, MatchdaySelector, ScoreHighlightCard, Standings, ZoneLegend } from "./preview-components";
import { MOCK_DATA_NOTICE } from "./mock-data";

export default function ChampionshipPreview({ leagues }: { leagues: LeagueMock[] }) {
  const [leagueId, setLeagueId] = useState<LeagueId>(leagues[0].id);
  const [day, setDay] = useState(leagues[0].currentMatchday);
  const [mobileTab, setMobileTab] = useState<"results" | "table">("results");
  const [expanded, setExpanded] = useState(false);
  const league = leagues.find((item) => item.id === leagueId) ?? leagues[0];
  const rows = useMemo(() => standingsFor(league), [league]);
  const highlights = useMemo(() => leagueHighlights(league), [league]);
  const selectLeague = (id: LeagueId) => { setLeagueId(id); setDay(leagues.find((item) => item.id === id)?.currentMatchday ?? 3); setExpanded(false); };

  const Results = <section aria-label={`Risultati ${league.name}`} className="space-y-4">
    <div className="flex items-end justify-between gap-3"><div><p className="section-eyebrow">Calendario</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Risultati</h2></div><span className="rounded-full bg-sky-100 px-3 py-1.5 text-[12px] font-black text-sky-700">Giornata {day}</span></div>
    <MatchdaySelector day={day} currentDay={league.currentMatchday} onChange={setDay} />
    <div className="grid gap-3">{league.matchdays[day]?.map((match) => <MatchCard key={match.id} match={match} future={day > league.currentMatchday} />)}</div>
    <div className="grid gap-3 sm:grid-cols-2"><ScoreHighlightCard title="Miglior punteggio della lega" value={highlights.best} tone="best" /><ScoreHighlightCard title="Peggior punteggio della lega" value={highlights.worst} tone="worst" /></div>
  </section>;

  const Table = <section aria-label={`Classifica ${league.name}`} className="space-y-4">
    <div className="flex items-end justify-between gap-3"><div><p className="section-eyebrow">Dopo 3 giornate</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Classifica</h2></div><span className="text-[12px] font-black text-slate-400">PT · Δ</span></div>
    <Standings rows={rows} expanded={expanded} />
    <ZoneLegend />
    <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="min-h-12 w-full rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">{expanded ? "Riduci classifica" : "Espandi classifica"}</button>
  </section>;

  return (
    <main className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 sm:py-10 lg:px-8 lg:py-14">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-[#0b3b78] to-sky-500 p-5 text-white shadow-2xl sm:p-8 lg:p-10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-amber-200">Prototipo · Versione 1.1</span><h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">Campionati</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/75 sm:text-base">Risultati, calendario e classifica delle cinque leghe del Fanta a 20.</p><p className="mt-4 text-[12px] font-black uppercase tracking-[0.12em] text-sky-100">{MOCK_DATA_NOTICE}</p></div>
      </header>
      <div className="sticky top-[4.25rem] z-20 -mx-1 mt-4 rounded-[1.5rem] border border-white/80 bg-slate-50/95 p-2 shadow-lg backdrop-blur lg:static lg:mt-6"><LeagueSelector leagues={leagues} selected={league.id} onSelect={selectLeague} /></div>
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-200 p-1 lg:hidden"><button type="button" aria-pressed={mobileTab === "results"} onClick={() => setMobileTab("results")} className={`min-h-11 rounded-xl text-sm font-black ${mobileTab === "results" ? "bg-white text-blue-950 shadow-sm" : "text-slate-500"}`}>Risultati</button><button type="button" aria-pressed={mobileTab === "table"} onClick={() => setMobileTab("table")} className={`min-h-11 rounded-xl text-sm font-black ${mobileTab === "table" ? "bg-white text-blue-950 shadow-sm" : "text-slate-500"}`}>Classifica</button></div>
      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.85fr)] lg:items-start lg:gap-6">
        <div className={mobileTab === "results" ? "block" : "hidden lg:block"}>{Results}</div>
        <div className={mobileTab === "table" ? "block" : "hidden lg:block"}>{Table}</div>
      </div>
    </main>
  );
}
