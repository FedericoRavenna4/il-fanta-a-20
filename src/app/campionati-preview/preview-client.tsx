"use client";

import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import type { LeagueId, LeagueMock } from "./types";
import { leagueHighlights, standingsFor } from "./mock-logic";
import { ExpandedStandingsModal, GlobalMatchdayStats, LeagueSelector, MatchCard, MatchdaySelector, ScoreHighlightCard, Standings, ZoneLegend } from "./preview-components";
import { MOCK_DATA_NOTICE } from "./mock-data";

export default function ChampionshipPreview({ leagues }: { leagues: LeagueMock[] }) {
  const [leagueId, setLeagueId] = useState<LeagueId>(leagues[0].id);
  const [day, setDay] = useState(leagues[0].currentMatchday);
  const [mobileTab, setMobileTab] = useState<"results" | "table">("results");
  const [modalOpen, setModalOpen] = useState(false);
  const league = leagues.find((item) => item.id === leagueId) ?? leagues[0];
  const rows = useMemo(() => standingsFor(league), [league]);
  const highlights = useMemo(() => leagueHighlights(league), [league]);
  const selectLeague = (id: LeagueId) => { setLeagueId(id); setDay(leagues.find((item) => item.id === id)?.currentMatchday ?? 3); setModalOpen(false); };

  const Results = <section aria-label={`Risultati ${league.name}`} className="space-y-4">
    <div className="flex items-end justify-between gap-3"><div><p className="section-eyebrow">Calendario</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Risultati</h2></div><span className="rounded-full bg-sky-100 px-3 py-1.5 text-[12px] font-black text-sky-700">Giornata {day}</span></div>
    <MatchdaySelector day={day} currentDay={league.currentMatchday} onChange={setDay} />
    <div className="grid gap-3">{league.matchdays[day]?.map((match) => <MatchCard key={match.id} match={match} future={day > league.currentMatchday} />)}</div>
    <div className="grid gap-3 sm:grid-cols-2"><ScoreHighlightCard title="Miglior punteggio di giornata" value={highlights.best} tone="best" /><ScoreHighlightCard title="Peggior punteggio di giornata" value={highlights.worst} tone="worst" /></div>
  </section>;

  const Table = <section aria-label={`Classifica ${league.name}`} className="space-y-4">
    <div className="flex items-end justify-between gap-3"><div><p className="section-eyebrow">Dopo 3 giornate</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Classifica</h2></div><span className="text-[12px] font-black text-slate-400">PT · Δ</span></div>
    <Standings rows={rows} leagueId={league.id} />
    <ZoneLegend leagueId={league.id} />
    <button type="button" onClick={() => setModalOpen(true)} className="min-h-12 w-full rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">Espandi classifica</button>
  </section>;

  return (
    <main className="mx-auto max-w-[1440px] overflow-x-clip px-3 py-5 sm:px-5 sm:py-10 lg:px-8 lg:py-14">
      <PageHeader eyebrow="Campionati" title="I Campionati" description="Risultati e classifiche delle cinque leghe del Fanta a 20." />
      <div className="-mt-2 sm:-mt-5"><GlobalMatchdayStats leagues={leagues} day={league.currentMatchday} /><p className="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{MOCK_DATA_NOTICE}</p></div>
      <div className="sticky top-[4.25rem] z-20 -mx-1 mt-5 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/95 p-1.5 shadow-[0_12px_35px_-22px_rgba(15,23,42,.45)] backdrop-blur lg:static lg:mt-7 lg:p-2"><LeagueSelector leagues={leagues} selected={league.id} onSelect={selectLeague} /></div>
      <div className="mt-4 grid min-w-0 grid-cols-2 rounded-2xl bg-slate-200 p-1 lg:hidden"><button type="button" aria-pressed={mobileTab === "results"} onClick={() => setMobileTab("results")} className={`min-h-11 min-w-0 rounded-xl text-sm font-black ${mobileTab === "results" ? "bg-white text-blue-950 shadow-sm" : "text-slate-500"}`}>Risultati</button><button type="button" aria-pressed={mobileTab === "table"} onClick={() => setMobileTab("table")} className={`min-h-11 min-w-0 rounded-xl text-sm font-black ${mobileTab === "table" ? "bg-white text-blue-950 shadow-sm" : "text-slate-500"}`}>Classifica</button></div>
      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.85fr)] lg:items-start lg:gap-6">
        <div className={mobileTab === "results" ? "block" : "hidden lg:block"}>{Results}</div>
        <div className={mobileTab === "table" ? "block" : "hidden lg:block"}>{Table}</div>
      </div>
      {modalOpen && <ExpandedStandingsModal rows={rows} league={league} onClose={() => setModalOpen(false)} />}
    </main>
  );
}
