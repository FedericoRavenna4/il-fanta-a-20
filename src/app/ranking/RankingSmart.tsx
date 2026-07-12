"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RankingRow } from "@/lib/rankingRows";

const fascia = (posizione: number) => Math.ceil(posizione / 20);

export default function RankingSmart({ rows }: { rows: RankingRow[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fasciaAttiva, setFasciaAttiva] = useState(1);
  const modalHeaderRef = useRef<HTMLDivElement>(null);
  const podio = rows.slice(0, 3);

  const classifica = useMemo(() => {
    return rows.filter((row) => `${row.team?.nome ?? row.nomeRanking} ${row.team?.fantallenatore ?? ""} ${row.team?.nicknameInstagram ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [open]);

  function updateFascia(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const threshold = container.getBoundingClientRect().top + (modalHeaderRef.current?.offsetHeight ?? 190) + 8;
    const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-ranking-row]"));
    const current = rows.find((row) => row.getBoundingClientRect().bottom > threshold);
    if (current?.dataset.fascia) setFasciaAttiva(Number(current.dataset.fascia));
  }

  function updateSearch(value: string) {
    setSearch(value);
    const first = rows.find((row) => `${row.team?.nome ?? row.nomeRanking} ${row.team?.fantallenatore ?? ""} ${row.team?.nicknameInstagram ?? ""}`.toLowerCase().includes(value.toLowerCase()));
    if (first) setFasciaAttiva(fascia(first.posizione));
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {podio[0]?.team && (
          <Link href={`/societa/${podio[0].team.slug}`} className="group relative overflow-hidden rounded-[2rem] border border-amber-300/40 bg-[linear-gradient(145deg,#17376f,#081f46)] p-7 text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-1">
            <div className="absolute right-0 top-0 h-52 w-52 bg-amber-300/12 blur-[65px]" />
            <div className="relative grid min-h-52 grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_150px]">
              <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Ranking leader</p><h3 className="mt-3 text-3xl font-black uppercase leading-tight">{podio[0].team.nome}</h3><div className="mt-6 flex gap-3"><span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black">{podio[0].puntiRanking} punti</span><span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black">{podio[0].trofei.totaleTrofei} trofei</span></div></div>
              <Image src={podio[0].team.logo} alt={podio[0].team.nome} width={145} height={145} className="mx-auto max-h-28 w-auto object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.3)] transition group-hover:scale-105 sm:max-h-36" />
            </div>
          </Link>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {podio.slice(1).map((row) => (
            <Link key={row.posizione} href={row.team ? `/societa/${row.team.slug}` : "#"} className="group grid min-h-24 grid-cols-[52px_1fr_76px] items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-3xl font-black text-slate-300">0{row.posizione}</p><div><h3 className="line-clamp-2 text-sm font-black uppercase text-blue-950">{row.team?.nome ?? row.nomeRanking}</h3><p className="mt-1 text-xs font-bold text-slate-400">{row.puntiRanking} punti</p></div>{row.team && <Image src={row.team.logo} alt={row.team.nome} width={70} height={70} className="max-h-16 max-w-16 object-contain transition group-hover:scale-105" />}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-200 p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Il Ranking</p><h3 className="mt-1 text-2xl font-black uppercase text-blue-950">La Top 10</h3></div>
        <div className="hidden grid-cols-[60px_minmax(0,1fr)_90px_150px_70px_80px] gap-3 bg-slate-50 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 lg:grid"><span>Pos.</span><span>Società</span><span>Ingresso</span><span>Lega attuale</span><span className="text-right">Trofei</span><span className="text-right text-blue-950">PT</span></div>
        {rows.slice(0, 10).map((row) => (
          <Link key={row.posizione} href={row.team ? `/societa/${row.team.slug}` : "#"} className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_52px] items-center gap-2 border-t border-slate-100 px-3 py-3 transition hover:bg-sky-50/60 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-3 sm:px-5 lg:grid-cols-[60px_minmax(0,1fr)_90px_150px_70px_80px] lg:px-6">
            <span className="text-sm font-black text-blue-950">{row.posizione}°</span><div className="flex min-w-0 items-center gap-3">{row.team && <Image src={row.team.logo} alt="" width={42} height={42} className="h-10 w-10 object-contain" />}<span className="truncate text-base font-black uppercase text-blue-950">{row.team?.nome ?? row.nomeRanking}</span></div><span className="hidden text-sm font-bold text-slate-500 lg:block">{row.team?.stagioneIngresso ?? "—"}</span><span className="hidden truncate text-sm font-bold text-slate-500 lg:block">{row.team?.legaAttuale ?? "—"}</span><span className="hidden text-right text-sm font-black text-blue-950 lg:block">{row.trofei.totaleTrofei}</span><span className="text-right text-base font-black text-blue-950">{row.puntiRanking}</span>
          </Link>
        ))}
        <div className="border-t border-slate-200 p-4 text-center sm:p-5"><button type="button" onClick={() => { setFasciaAttiva(1); setOpen(true); }} className="min-h-12 w-full rounded-full bg-blue-950 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-blue-800 sm:w-auto sm:px-7 sm:tracking-[0.14em]">Vedi tutta la classifica del Ranking</button></div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Classifica completa del ranking" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-md sm:p-4" onMouseDown={() => setOpen(false)}>
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-6xl overflow-y-auto overscroll-contain rounded-[1.5rem] bg-[#f8fbff] shadow-2xl sm:max-h-[90dvh] sm:rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()} onScroll={updateFascia}>
            <div ref={modalHeaderRef} className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur-xl sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500 sm:text-[10px] sm:tracking-[0.2em]">Classifica completa</p><h2 className="mt-1 text-xl font-black uppercase text-blue-950 sm:text-2xl">Il Ranking</h2></div><button onClick={() => setOpen(false)} className="min-h-11 shrink-0 rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase text-blue-950">Chiudi</button></div>
              <input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Cerca società, fantallenatore o nickname..." className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold outline-none focus:border-blue-900" />
              {!search && <div className="mt-4 rounded-[1.1rem] border border-sky-200/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.98))] px-4 py-3 shadow-sm shadow-sky-100/70">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-950">{fasciaAttiva}ª Fascia</p>
                <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_52px_60px] items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 lg:grid-cols-[60px_minmax(220px,1fr)_90px_150px_65px_75px] lg:gap-3 lg:tracking-[0.14em]">
                  <span>Pos.</span>
                  <span>Società</span>
                  <span className="hidden lg:block">Ingresso</span>
                  <span className="hidden lg:block">Lega attuale</span>
                  <span className="text-right">Trofei</span>
                  <span className="text-right text-blue-950">PT</span>
                </div>
              </div>}
            </div>
            <div className="p-3 sm:p-5 lg:p-7">
              {classifica.map((row, index) => (
                <div key={row.posizione} data-ranking-row data-fascia={fascia(row.posizione)}>
                  {!search && index > 0 && fascia(row.posizione) !== fascia(classifica[index - 1].posizione) && (
                    <div className="my-4 h-[3px] rounded-full bg-gradient-to-r from-blue-950 via-sky-400 to-transparent shadow-[0_2px_8px_rgba(14,165,233,0.18)]" />
                  )}
                  <Link href={row.team ? `/societa/${row.team.slug}` : "#"} className="grid grid-cols-[44px_minmax(0,1fr)_52px_60px] items-center gap-2 border-b border-slate-100 px-2 py-3 transition hover:bg-white lg:grid-cols-[60px_minmax(220px,1fr)_90px_150px_65px_75px] lg:gap-3 lg:px-4">
                    <span className="font-black text-blue-950">{row.posizione}°</span>
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">{row.team && <Image src={row.team.logo} alt="" width={40} height={40} className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10" />}<span className="truncate text-sm font-black uppercase text-blue-950 sm:text-base">{row.team?.nome ?? row.nomeRanking}</span></div>
                    <span className="hidden text-sm font-bold text-slate-500 lg:block">{row.team?.stagioneIngresso ?? "—"}</span>
                    <span className="hidden truncate text-sm font-bold text-slate-500 lg:block">{row.team?.legaAttuale ?? "—"}</span>
                    <span className="text-right text-sm font-black text-blue-950">{row.trofei.totaleTrofei}</span>
                    <span className="text-right text-base font-black text-blue-950">{row.puntiRanking}</span>
                  </Link>
                </div>
              ))}
              {classifica.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 px-8 text-center">
                  <p className="text-lg font-black uppercase text-blue-950">Nessuna società trovata</p>
                  <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">Prova con un altro nome, fantallenatore o nickname.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
