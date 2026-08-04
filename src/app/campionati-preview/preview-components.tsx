"use client";

import Image from "next/image";
import type { LeagueId, LeagueMock, MockMatch, ScoreHighlight, StandingRow } from "./types";
import { globalDayStats } from "./mock-logic";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

export function LeagueSelector({ leagues, selected, onSelect }: { leagues: LeagueMock[]; selected: LeagueId; onSelect: (id: LeagueId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex" aria-label="Seleziona lega">
      {leagues.map((league, index) => (
        <button key={league.id} type="button" onClick={() => onSelect(league.id)} aria-pressed={selected === league.id}
          className={`${focus} min-h-11 rounded-2xl px-3 py-2 text-[12px] font-black transition sm:flex-1 sm:text-sm ${index === 4 ? "col-span-2" : ""} ${selected === league.id ? "bg-blue-950 text-white shadow-lg shadow-blue-950/20" : "border border-slate-200 bg-white text-blue-950 hover:border-sky-300 hover:bg-sky-50"}`}>
          <span className="sm:hidden">{league.shortName}</span><span className="hidden sm:inline">{league.name}</span>
        </button>
      ))}
    </div>
  );
}

export function MatchdaySelector({ day, currentDay, onChange }: { day: number; currentDay: number; onChange: (day: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <button type="button" disabled={day === 1} onClick={() => onChange(day - 1)} aria-label="Giornata precedente" className={`${focus} flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-blue-950 shadow-sm disabled:opacity-35`}>←</button>
      <label className="flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-black text-blue-950">
        <span className="hidden sm:inline">Giornata</span>
        <select aria-label="Seleziona giornata" value={day} onChange={(event) => onChange(Number(event.target.value))} className={`${focus} h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-blue-950`}>
          {Array.from({ length: 38 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}{index + 1 === currentDay ? " · attuale" : ""}</option>)}
        </select>
      </label>
      <button type="button" disabled={day === 38} onClick={() => onChange(day + 1)} aria-label="Giornata successiva" className={`${focus} flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-blue-950 shadow-sm disabled:opacity-35`}>→</button>
    </div>
  );
}

function TeamLine({ team, score, goals, align = "left" }: { team: MockMatch["home"]; score: number | null; goals: number | null; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Image src={team.logo} alt="" width={42} height={42} className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-black uppercase text-blue-950 sm:text-sm">{team.name}</p><p className="mt-0.5 text-[12px] font-bold text-slate-400">{score === null ? "—" : `${score.toFixed(1)} fp`}</p></div>
      <span className="text-xl font-black tabular-nums text-blue-950">{goals ?? "–"}</span>
    </div>
  );
}

export function MatchCard({ match, future }: { match: MockMatch; future: boolean }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      {future && <p className="mb-2 text-center text-[12px] font-black uppercase tracking-[0.14em] text-sky-600">Da giocare</p>}
      <div className="flex items-center gap-2"><TeamLine team={match.home} score={match.homeScore} goals={match.homeGoals} /><span className="text-[12px] font-black text-slate-300">VS</span><TeamLine team={match.away} score={match.awayScore} goals={match.awayGoals} align="right" /></div>
    </article>
  );
}

export function ScoreHighlightCard({ title, value, tone }: { title: string; value: ScoreHighlight; tone: "best" | "worst" }) {
  return (
    <article className={`rounded-[1.5rem] border p-4 ${tone === "best" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
      <p className={`text-[12px] font-black uppercase tracking-[0.16em] ${tone === "best" ? "text-emerald-700" : "text-rose-700"}`}>{title}</p>
      <div className="mt-3 flex items-center gap-3"><Image src={value.team.logo} alt="" width={52} height={52} className="h-12 w-12 object-contain" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black uppercase text-blue-950">{value.team.name}</p><p className="text-[12px] font-bold text-slate-500">Giornata {value.matchday}</p></div><strong className="text-xl font-black text-blue-950">{value.score.toFixed(1)}</strong></div>
    </article>
  );
}

function zone(position: number) {
  if (position <= 4) return { color: "bg-blue-500", label: "Champions League" };
  if (position <= 6) return { color: "bg-orange-500", label: "Europa League" };
  if (position === 7) return { color: "bg-emerald-500", label: "Conference League" };
  if (position >= 18) return { color: "bg-rose-500", label: "Retrocessione" };
  return { color: "bg-transparent", label: "Nessuna zona" };
}

function Movement({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400" aria-label="Posizione invariata">—</span>;
  return <span className={`font-black ${value > 0 ? "text-emerald-600" : "text-rose-600"}`} aria-label={`${Math.abs(value)} posizioni ${value > 0 ? "guadagnate" : "perse"}`}>{value > 0 ? "↑" : "↓"}{Math.abs(value)}</span>;
}

export function Standings({ rows, expanded }: { rows: StandingRow[]; expanded: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      {rows.map((row) => { const marker = zone(row.position); return (
        <div key={row.id} className="relative border-b border-slate-100 last:border-0">
          <span className={`absolute inset-y-0 left-0 w-1 ${marker.color}`} title={marker.label} />
          <div className="grid min-h-14 grid-cols-[28px_36px_minmax(0,1fr)_42px_38px] items-center gap-2 px-3 py-2 text-[12px] sm:grid-cols-[30px_40px_minmax(0,1fr)_48px_42px]">
            <span className="text-center font-black text-slate-500">{row.position}</span><Image src={row.logo} alt="" width={38} height={38} className="h-8 w-8 object-contain" /><span className="truncate font-black uppercase text-blue-950">{row.name}</span><strong className="text-right text-sm text-blue-950">{row.points}</strong><span className="text-center"><Movement value={row.movement} /></span>
          </div>
          {expanded && <div className="grid grid-cols-4 gap-x-2 gap-y-3 bg-slate-50 px-4 py-3 text-center text-[12px] sm:grid-cols-8">
            {[["G",row.played],["V",row.won],["N",row.drawn],["P",row.lost],["GF",row.goalsFor],["GS",row.goalsAgainst],["DR",row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference],["FP",row.fantasyPoints.toFixed(1)]].map(([label, value]) => <div key={label}><span className="block font-bold text-slate-400">{label}</span><strong className="mt-0.5 block text-blue-950">{value}</strong></div>)}
          </div>}
        </div>
      ); })}
    </div>
  );
}

export function ZoneLegend() {
  return <div className="flex flex-wrap gap-x-3 gap-y-2 text-[12px] font-bold text-slate-500">{[["bg-blue-500","Champions"],["bg-orange-500","Europa"],["bg-emerald-500","Conference"],["bg-rose-500","Retrocessione"]].map(([color,label]) => <span key={label} className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}</div>;
}

export function GlobalMatchdayStats({ leagues, day }: { leagues: LeagueMock[]; day: number }) {
  const stats = globalDayStats(leagues, day);
  if (!stats.best || !stats.worst || !stats.highestScoringMatch) return <div className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">La giornata non è ancora stata giocata.</div>;
  const match = stats.highestScoringMatch;
  return <section className="grid gap-3 md:grid-cols-3"><ScoreHighlightCard title="Miglior punteggio assoluto" value={stats.best} tone="best" /><article className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4"><p className="text-[12px] font-black uppercase tracking-[0.16em] text-sky-700">Partita con più gol</p><p className="mt-4 text-sm font-black uppercase text-blue-950">{match.home.name} {match.homeGoals}–{match.awayGoals} {match.away.name}</p><p className="mt-1 text-[12px] font-bold text-slate-500">{(match.homeScore! + match.awayScore!).toFixed(1)} fantapunti complessivi</p></article><ScoreHighlightCard title="Peggior punteggio assoluto" value={stats.worst} tone="worst" /></section>;
}

