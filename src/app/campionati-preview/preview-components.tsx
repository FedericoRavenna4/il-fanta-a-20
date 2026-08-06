"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LeagueId, LeagueMock, MockMatch, ScoreHighlight, StandingRow } from "./types";
import { globalDayStats } from "./mock-logic";
import styles from "./preview.module.css";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

function AutoMarquee({ children, className = "" }: { children: string; className?: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const text = textRef.current;
      if (!viewport || !text) return;
      const overflow = text.getBoundingClientRect().width - viewport.getBoundingClientRect().width;
      setDistance(overflow > 1 ? Math.ceil(overflow) : 0);
    };
    measure();
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [children]);
  const marqueeStyle = distance > 0 ? ({ "--marquee-distance": `-${distance}px` } as CSSProperties) : undefined;
  return <span ref={viewportRef} className={`${styles.marqueeViewport} ${className}`} title={children}><span ref={textRef} style={marqueeStyle} className={`${styles.marqueeText} ${distance > 0 ? styles.marqueeActive : ""}`}>{children}</span></span>;
}

export function LeagueSelector({ leagues, selected, onSelect }: { leagues: LeagueMock[]; selected: LeagueId; onSelect: (id: LeagueId) => void }) {
  const colors: Record<LeagueId, { active: string; idle: string; dot: string }> = {
    "serie-a": { active: "from-sky-500 to-blue-700 ring-sky-200", idle: "border-sky-200 bg-sky-50/70 text-sky-950 hover:border-sky-400", dot: "bg-sky-500" },
    "serie-b": { active: "from-emerald-500 to-teal-700 ring-emerald-200", idle: "border-emerald-200 bg-emerald-50/70 text-emerald-950 hover:border-emerald-400", dot: "bg-emerald-500" },
    "serie-c-a": { active: "from-violet-500 to-indigo-700 ring-violet-200", idle: "border-violet-200 bg-violet-50/70 text-violet-950 hover:border-violet-400", dot: "bg-violet-500" },
    "serie-c-b": { active: "from-violet-500 to-indigo-700 ring-violet-200", idle: "border-violet-200 bg-violet-50/70 text-violet-950 hover:border-violet-400", dot: "bg-violet-500" },
    "serie-c-c": { active: "from-violet-500 to-indigo-700 ring-violet-200", idle: "border-violet-200 bg-violet-50/70 text-violet-950 hover:border-violet-400", dot: "bg-violet-500" },
  };
  return (
    <div className="grid min-w-0 grid-cols-5 gap-1 sm:gap-2" aria-label="Seleziona lega">
      {leagues.map((league) => (
        <button key={league.id} type="button" onClick={() => onSelect(league.id)} aria-pressed={selected === league.id}
          className={`${focus} flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-0.5 py-2 text-center text-[10px] font-black leading-tight transition min-[390px]:text-[11px] sm:min-h-16 sm:rounded-2xl sm:px-3 sm:text-sm ${selected === league.id ? `border-transparent bg-gradient-to-br text-white shadow-lg ring-2 ring-offset-1 ${colors[league.id].active}` : `${colors[league.id].idle} shadow-sm hover:-translate-y-0.5`}`}>
          <i className={`hidden h-1.5 w-1.5 shrink-0 rounded-full sm:block ${selected === league.id ? "bg-white/85" : colors[league.id].dot}`} /><span className="min-w-0 sm:hidden">{league.id === "serie-c-a" ? "C Gir A" : league.id === "serie-c-b" ? "C Gir B" : league.id === "serie-c-c" ? "C Gir C" : league.shortName}</span><span className="hidden min-w-0 sm:inline">{league.name}</span>
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
    <Link href={`/societa/${team.slug}`} className={`${focus} flex min-w-0 flex-1 items-center gap-2 rounded-lg ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Image src={team.logo} alt="" width={42} height={42} className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
      <AutoMarquee className="min-w-0 flex-1 text-[12px] font-black uppercase text-blue-950 sm:text-sm">{team.name}</AutoMarquee>
    </Link>
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

const competitionIcons = {
  champions: "/icon/competizioni/champions_league_logo.png",
  europa: "/icon/competizioni/europa_league_logo.png",
  conference: "/icon/competizioni/conference_league_logo.png",
  promotion: "/icon/competizioni/scatto_promozione_logo.png",
};

function Movement({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400" aria-label="Posizione invariata">—</span>;
  return <span className={`font-black ${value > 0 ? "text-emerald-600" : "text-rose-600"}`} aria-label={`${Math.abs(value)} posizioni ${value > 0 ? "guadagnate" : "perse"}`}>{value > 0 ? "↑" : "↓"}{Math.abs(value)}</span>;
}

function QualificationIcons({ position, leagueId }: { position: number; leagueId: LeagueId }) {
  const serieC = leagueId.startsWith("serie-c");
  const icons = [
    ...(position <= 8 ? [[competitionIcons.champions, "Champions League"]] : position <= 14 ? [[competitionIcons.europa, "Europa League"]] : [[competitionIcons.conference, "Conference League"]]),
    ...(serieC && position <= 5 ? [[competitionIcons.promotion, "Scatto Promozione"]] : []),
  ];
  return <span className="inline-flex items-center justify-end gap-1">{icons.map(([src, label]) => <Image key={src} src={src} alt={label} title={label} width={16} height={16} className="h-3.5 w-3.5 shrink-0 object-contain sm:h-4 sm:w-4" />)}</span>;
}

function lastSafePosition(leagueId: LeagueId) {
  if (leagueId === "serie-a") return 17;
  if (leagueId === "serie-b") return 16;
  return null;
}

export function Standings({ rows, leagueId }: { rows: StandingRow[]; leagueId: LeagueId }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      {rows.map((row) => { const marker = zone(row.position); return (
        <div key={row.id} className={`relative border-b border-slate-100 last:border-0 ${row.position === lastSafePosition(leagueId) ? "after:absolute after:-bottom-px after:left-0 after:right-0 after:z-10 after:h-px after:bg-rose-500" : ""}`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${marker.color}`} title={marker.label} />
          <div className="grid min-h-14 grid-cols-[22px_34px_minmax(0,1fr)_34px_34px_30px] items-center gap-1 px-2 py-2 text-[12px] sm:grid-cols-[24px_40px_minmax(0,1fr)_42px_48px_42px] sm:gap-1.5 sm:px-3">
            <span className="text-center font-black tabular-nums text-slate-500">{row.position}</span><Image src={row.logo} alt="" width={38} height={38} className="h-8 w-8 object-contain" /><Link href={`/societa/${row.slug}`} className={`${focus} block min-w-0 overflow-hidden rounded font-black uppercase text-blue-950`}><AutoMarquee>{row.name}</AutoMarquee></Link><QualificationIcons position={row.position} leagueId={leagueId} /><strong className="text-right text-sm text-blue-950">{row.points}</strong><span className="text-center"><Movement value={row.movement} /></span>
          </div>
        </div>
      ); })}
    </div>
  );
}

export function ZoneLegend({ leagueId }: { leagueId: LeagueId }) {
  const serieC = leagueId.startsWith("serie-c");
  return <div className="space-y-2 text-[12px] font-bold text-slate-500"><div className="flex flex-wrap gap-x-3 gap-y-2">{[["bg-blue-500","1–8 Champions"],["bg-orange-500","9–14 Europa"],["bg-emerald-500","15–20 Conference"]].map(([color,label]) => <span key={label} className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}</div><p className="border-t border-slate-200 pt-2 text-slate-600">{serieC ? "1ª promossa · 1–5 Scatto Promozione · nessuna retrocessione" : leagueId === "serie-b" ? "1–3 promosse · linea rossa: zona retrocessione (17–20)" : "Linea rossa: zona retrocessione (18–20)"}</p></div>;
}

type SortKey = "position" | "logo" | "name" | "points" | "fantasyPoints" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst";

export function ExpandedStandingsModal({ rows, league, onClose }: { rows: StandingRow[]; league: LeagueMock; onClose: () => void }) {
  const [sort, setSort] = useState<SortKey>("position");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", escape); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); }; }, [onClose]);
  const sorted = useMemo(() => [...rows].sort((a, b) => { const left = sort === "name" || sort === "logo" ? a.name : a[sort]; const right = sort === "name" || sort === "logo" ? b.name : b[sort]; const result = typeof left === "string" ? left.localeCompare(String(right), "it") : Number(left) - Number(right); return direction === "asc" ? result : -result; }), [rows, sort, direction]);
  const changeSort = (key: SortKey) => { if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc"); else { setSort(key); setDirection(key === "name" || key === "position" ? "asc" : "desc"); } };
  const headers: Array<[SortKey, string]> = [["position","POS"],["logo","LOGO"],["name","SQUADRA"],["points","PT"],["fantasyPoints","PT TOT"],["won","V"],["drawn","P"],["lost","S"],["goalsFor","GF"],["goalsAgainst","GS"]];
  return (
    <div role="dialog" aria-modal="true" aria-label={`Classifica completa ${league.name}`} className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md sm:p-3" onMouseDown={onClose}>
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden bg-[#f8fbff] shadow-2xl sm:h-[calc(100dvh-1.5rem)] sm:rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
          <div><p className="section-eyebrow">{league.name}</p><h2 className="mt-1 text-lg font-black uppercase text-blue-950 sm:text-2xl">Classifica completa</h2><p className="mt-0.5 text-[11px] font-bold text-slate-500 sm:text-sm">Giornata {league.currentMatchday}</p></div>
          <button type="button" onClick={onClose} aria-label="Chiudi classifica" className={`${focus} flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-blue-950 shadow-sm`}>×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full table-fixed border-collapse text-[10px] sm:text-[12px]">
            <colgroup><col className="w-[11%] sm:w-[8%]" /><col className="w-[8%] sm:w-[7%]" /><col className="w-[23%] sm:w-[29%]" />{Array.from({ length: 7 }, (_, index) => <col key={index} className="w-[8.25%] sm:w-[8%]" />)}</colgroup>
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur"><tr>{headers.map(([key,label]) => <th key={key} className={`border-b border-slate-200 px-0.5 py-2 font-black leading-tight text-slate-500 ${key === "name" ? "text-left" : "text-center"}`}><button type="button" onClick={() => changeSort(key)} aria-label={`Ordina per ${label}`} className={`${focus} w-full rounded py-1 hover:text-blue-950`}><span className={key === "fantasyPoints" ? "block leading-[1.05]" : ""}>{key === "fantasyPoints" ? <>PT<br />TOT</> : label}</span><span aria-hidden="true" className="block text-slate-400">{sort === key ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button></th>)}</tr></thead>
            <tbody>{sorted.map((row) => { const marker = zone(row.position); const relegationLine = row.position === lastSafePosition(league.id); const values = [row.points,row.fantasyPoints.toFixed(1),row.won,row.drawn,row.lost,row.goalsFor,row.goalsAgainst]; return <tr key={row.id} className={`border-b border-slate-200/80 ${marker.tint} ${relegationLine ? "border-b-2 border-b-rose-500" : ""}`}><td className="border-l-[3px] px-0.5 py-1.5 text-center font-black" style={{ borderLeftColor: row.position <= 8 ? "#3b82f6" : row.position <= 14 ? "#f97316" : "#10b981" }}><span className="text-center tabular-nums">{row.position}</span></td><td className="p-0.5 text-center"><Link href={`/societa/${row.slug}`} aria-label={`Apri ${row.name}`} className={`${focus} inline-flex rounded`}><Image src={row.logo} alt="" width={24} height={24} className="h-5 w-5 object-contain sm:h-7 sm:w-7" /></Link></td><td className="min-w-0 px-0.5 py-1.5"><Link href={`/societa/${row.slug}`} className={`${focus} block min-w-0 overflow-hidden rounded`}><AutoMarquee className="font-black uppercase text-blue-950">{row.name}</AutoMarquee></Link></td>{values.map((value,index) => <td key={index} className="px-px py-1.5 text-center font-bold tabular-nums text-blue-950">{value}</td>)}</tr>; })}</tbody>
          </table>
        </div>
        <footer className="border-t border-slate-200 bg-white px-3 py-2"><ZoneLegend leagueId={league.id} /></footer>
      </div>
    </div>
  );
}

export function GlobalMatchdayStats({ leagues, day }: { leagues: LeagueMock[]; day: number }) {
  const stats = globalDayStats(leagues, day);
  if (!stats.best || !stats.worst || !stats.highestScoringMatch) return <div className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">La giornata non è ancora stata giocata.</div>;
  const match = stats.highestScoringMatch;
  return <section className="grid gap-3 md:grid-cols-3"><ScoreHighlightCard title="🏆 MVP di giornata" value={stats.best} tone="best" /><article className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4"><p className="text-[12px] font-black uppercase tracking-[0.16em] text-sky-700">⚽ Partita con più gol</p><div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className="min-w-0 text-center"><Image src={match.home.logo} alt="" width={38} height={38} className="mx-auto h-8 w-8 object-contain" /><AutoMarquee className="mt-1 text-[11px] font-black uppercase text-blue-950">{match.home.name}</AutoMarquee></div><strong className="whitespace-nowrap text-base font-black text-blue-950">{match.homeGoals}–{match.awayGoals}</strong><div className="min-w-0 text-center"><Image src={match.away.logo} alt="" width={38} height={38} className="mx-auto h-8 w-8 object-contain" /><AutoMarquee className="mt-1 text-[11px] font-black uppercase text-blue-950">{match.away.name}</AutoMarquee></div></div><p className="mt-1 text-center text-[11px] font-bold text-slate-500">{(match.homeScore! + match.awayScore!).toFixed(1)} fantapunti complessivi</p></article><ScoreHighlightCard title="💀 Peggior punteggio di giornata" value={stats.worst} tone="worst" /></section>;
}
