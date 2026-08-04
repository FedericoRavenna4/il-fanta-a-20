"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { LeagueId, LeagueMock, MockMatch, ScoreHighlight, StandingRow } from "./types";
import { globalDayStats } from "./mock-logic";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

export function LeagueSelector({ leagues, selected, onSelect }: { leagues: LeagueMock[]; selected: LeagueId; onSelect: (id: LeagueId) => void }) {
  const colors: Record<LeagueId, string> = {
    "serie-a": "from-sky-500 to-blue-700 ring-sky-200",
    "serie-b": "from-emerald-500 to-teal-700 ring-emerald-200",
    "serie-c-a": "from-violet-500 to-indigo-700 ring-violet-200",
    "serie-c-b": "from-amber-500 to-orange-700 ring-amber-200",
    "serie-c-c": "from-rose-500 to-fuchsia-800 ring-rose-200",
  };
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Seleziona lega">
      {leagues.map((league) => (
        <button key={league.id} type="button" onClick={() => onSelect(league.id)} aria-pressed={selected === league.id}
          className={`${focus} flex min-h-14 items-center justify-center rounded-xl px-1.5 py-2 text-center text-[12px] font-black leading-tight transition sm:min-h-16 sm:rounded-2xl sm:px-3 sm:text-sm ${selected === league.id ? `bg-gradient-to-br text-white shadow-lg ring-2 ring-offset-2 ${colors[league.id]}` : "border border-slate-200 bg-white text-blue-950 shadow-sm hover:-translate-y-0.5 hover:border-slate-300"}`}>
          <span className="sm:hidden">{league.id === "serie-c-a" ? "C Gir A" : league.id === "serie-c-b" ? "C Gir B" : league.id === "serie-c-c" ? "C Gir C" : league.shortName}</span><span className="hidden sm:inline">{league.name}</span>
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

function TeamLine({ team, align = "left" }: { team: MockMatch["home"]; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Image src={team.logo} alt="" width={42} height={42} className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
      <p className="min-w-0 flex-1 truncate text-[12px] font-black uppercase text-blue-950 sm:text-sm">{team.name}</p>
    </div>
  );
}

export function MatchCard({ match, future }: { match: MockMatch; future: boolean }) {
  return (
    <article className="rounded-[1.2rem] border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm sm:px-3 sm:py-3">
      {future && <p className="mb-1 text-center text-[12px] font-black uppercase tracking-[0.12em] text-sky-600">Da giocare</p>}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] sm:gap-2">
        <TeamLine team={match.home} />
        <div className="text-center"><p className="text-lg font-black tabular-nums leading-none text-blue-950">{match.homeGoals ?? "–"} - {match.awayGoals ?? "–"}</p><p className="mt-1 whitespace-nowrap text-[12px] font-bold tabular-nums leading-none text-slate-500">{match.homeScore === null ? "—" : match.homeScore.toFixed(1)} - {match.awayScore === null ? "—" : match.awayScore.toFixed(1)}</p></div>
        <TeamLine team={match.away} align="right" />
      </div>
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
  if (position <= 8) return { color: "bg-blue-500", tint: "bg-blue-50/45", label: "Champions League" };
  if (position <= 14) return { color: "bg-orange-500", tint: "bg-orange-50/40", label: "Europa League" };
  return { color: "bg-emerald-500", tint: "bg-emerald-50/35", label: "Conference League" };
}

function Movement({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400" aria-label="Posizione invariata">—</span>;
  return <span className={`font-black ${value > 0 ? "text-emerald-600" : "text-rose-600"}`} aria-label={`${Math.abs(value)} posizioni ${value > 0 ? "guadagnate" : "perse"}`}>{value > 0 ? "↑" : "↓"}{Math.abs(value)}</span>;
}

export function Standings({ rows, leagueId }: { rows: StandingRow[]; leagueId: LeagueId }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      {rows.map((row) => { const marker = zone(row.position); return (
        <div key={row.id} className={`relative border-b border-slate-100 last:border-0 ${leagueId !== "serie-c-a" && leagueId !== "serie-c-b" && leagueId !== "serie-c-c" && row.position === 16 ? "after:absolute after:-bottom-px after:left-0 after:right-0 after:z-10 after:h-px after:bg-rose-500" : ""}`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${marker.color}`} title={marker.label} />
          <div className="grid min-h-14 grid-cols-[28px_36px_minmax(0,1fr)_42px_38px] items-center gap-2 px-3 py-2 text-[12px] sm:grid-cols-[30px_40px_minmax(0,1fr)_48px_42px]">
            <span className="text-center font-black text-slate-500">{row.position}</span><Image src={row.logo} alt="" width={38} height={38} className="h-8 w-8 object-contain" /><span className="truncate font-black uppercase text-blue-950">{row.name}</span><strong className="text-right text-sm text-blue-950">{row.points}</strong><span className="text-center"><Movement value={row.movement} /></span>
          </div>
        </div>
      ); })}
    </div>
  );
}

export function ZoneLegend({ leagueId }: { leagueId: LeagueId }) {
  const serieC = leagueId.startsWith("serie-c");
  return <div className="space-y-2 text-[12px] font-bold text-slate-500"><div className="flex flex-wrap gap-x-3 gap-y-2">{[["bg-blue-500","1–8 Champions"],["bg-orange-500","9–14 Europa"],["bg-emerald-500","15–20 Conference"]].map(([color,label]) => <span key={label} className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}</div><p className="border-t border-slate-200 pt-2 text-slate-600">{serieC ? "1ª promossa · 1–5 Scatto Promozione · nessuna retrocessione" : leagueId === "serie-b" ? "1–3 promosse · linea rossa: zona retrocessione (17–20)" : "Linea rossa: zona retrocessione (17–20)"}</p></div>;
}

type SortKey = "position" | "name" | "points" | "fantasyPoints" | "played" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst" | "goalDifference";

export function ExpandedStandingsModal({ rows, league, onClose }: { rows: StandingRow[]; league: LeagueMock; onClose: () => void }) {
  const [sort, setSort] = useState<SortKey>("position");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", escape); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); }; }, [onClose]);
  const sorted = useMemo(() => [...rows].sort((a, b) => { const left = sort === "name" ? a.name : a[sort]; const right = sort === "name" ? b.name : b[sort]; const result = typeof left === "string" ? left.localeCompare(String(right), "it") : Number(left) - Number(right); return direction === "asc" ? result : -result; }), [rows, sort, direction]);
  const changeSort = (key: SortKey) => { if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc"); else { setSort(key); setDirection(key === "name" || key === "position" ? "asc" : "desc"); } };
  const headers: Array<[SortKey, string]> = [["position","POS"],["name","SQUADRA"],["points","PT"],["fantasyPoints","PT TOT"],["played","G"],["won","V"],["drawn","P"],["lost","S"],["goalsFor","GF"],["goalsAgainst","GS"],["goalDifference","DR"]];
  return <div role="dialog" aria-modal="true" aria-label={`Classifica completa ${league.name}`} className="fixed inset-0 z-[100] bg-slate-950/65 p-0 backdrop-blur-md sm:p-4" onMouseDown={onClose}><div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden bg-[#f8fbff] shadow-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div><p className="section-eyebrow">{league.name}</p><h2 className="mt-1 text-xl font-black uppercase text-blue-950 sm:text-2xl">Classifica completa</h2></div><button type="button" onClick={onClose} aria-label="Chiudi classifica" className={`${focus} flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-blue-950 shadow-sm`}>×</button></header><div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[920px] border-collapse text-[12px]"><thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur"><tr>{headers.map(([key,label]) => <th key={key} className={`border-b border-slate-200 px-3 py-3 font-black text-slate-500 ${key === "name" ? "text-left" : "text-center"}`}><button type="button" onClick={() => changeSort(key)} className={`${focus} whitespace-nowrap rounded px-1 py-1 hover:text-blue-950`}>{label} <span aria-hidden="true">{sort === key ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button></th>)}</tr></thead><tbody>{sorted.map((row) => { const marker = zone(row.position); const relegationLine = !league.id.startsWith("serie-c") && row.position === 16; return <tr key={row.id} className={`relative border-b border-slate-100 ${marker.tint} ${relegationLine ? "border-b-2 border-b-rose-500" : ""}`}><td className="border-l-4 px-3 py-3 text-center font-black" style={{ borderLeftColor: row.position <= 8 ? "#3b82f6" : row.position <= 14 ? "#f97316" : "#10b981" }}>{row.position}</td><td className="px-3 py-2"><div className="flex items-center gap-2"><Image src={row.logo} alt="" width={34} height={34} className="h-8 w-8 object-contain" /><span className="max-w-52 truncate font-black uppercase text-blue-950">{row.name}</span></div></td>{[row.points,row.fantasyPoints.toFixed(1),row.played,row.won,row.drawn,row.lost,row.goalsFor,row.goalsAgainst,row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference].map((value,index) => <td key={index} className="px-3 py-3 text-center font-bold tabular-nums text-blue-950">{value}</td>)}</tr>; })}</tbody></table></div><footer className="border-t border-slate-200 bg-white px-4 py-3"><ZoneLegend leagueId={league.id} /></footer></div></div>;
}

export function GlobalMatchdayStats({ leagues, day }: { leagues: LeagueMock[]; day: number }) {
  const stats = globalDayStats(leagues, day);
  if (!stats.best || !stats.worst || !stats.highestScoringMatch) return <div className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">La giornata non è ancora stata giocata.</div>;
  const match = stats.highestScoringMatch;
  return <section className="grid gap-3 md:grid-cols-3"><ScoreHighlightCard title="🏆 MVP di giornata" value={stats.best} tone="best" /><article className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4"><p className="text-[12px] font-black uppercase tracking-[0.16em] text-sky-700">⚽ Partita con più gol</p><p className="mt-4 text-sm font-black uppercase text-blue-950">{match.home.name} {match.homeGoals}–{match.awayGoals} {match.away.name}</p><p className="mt-1 text-[12px] font-bold text-slate-500">{(match.homeScore! + match.awayScore!).toFixed(1)} fantapunti complessivi</p></article><ScoreHighlightCard title="💀 Peggior punteggio di giornata" value={stats.worst} tone="worst" /></section>;
}
