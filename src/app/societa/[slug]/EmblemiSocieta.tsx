"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type EmblemaVisuale = {
  chiave: string;
  titolo: string;
  descrizione: string;
  rarita: "Base" | "Comune" | "Raro" | "Leggendario";
};

const ordineRarita: EmblemaVisuale["rarita"][] = [
  "Leggendario",
  "Raro",
  "Comune",
  "Base",
];

function raritaClass(rarita: EmblemaVisuale["rarita"]) {
  if (rarita === "Leggendario") return "text-amber-300";
  if (rarita === "Raro") return "text-sky-300";
  if (rarita === "Comune") return "text-emerald-300";
  return "text-slate-300";
}

function Emblema({ emblema, grande = false }: { emblema: EmblemaVisuale; grande?: boolean }) {
  return (
    <div tabIndex={0} className={`group relative flex shrink-0 items-center justify-center outline-none ${grande ? "h-28 w-28" : "h-24 w-full"}`}>
      <div className="pointer-events-none absolute h-16 w-16 bg-amber-300/0 blur-2xl transition duration-300 group-hover:bg-amber-300/35 group-focus:bg-amber-300/35" />
      <Image
        src={`/emblemi/${emblema.chiave}.png`}
        alt={emblema.titolo}
        width={grande ? 100 : 86}
        height={grande ? 100 : 86}
        className={`relative object-contain drop-shadow-[0_12px_17px_rgba(15,23,42,0.26)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 ${grande ? "max-h-24 max-w-24" : "max-h-20 max-w-20"}`}
      />
      <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[120] w-auto translate-y-2 rounded-[1.1rem] border border-white/15 bg-blue-950/95 p-4 text-left text-white opacity-0 shadow-2xl backdrop-blur-xl transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100 sm:absolute sm:bottom-full sm:left-1/2 sm:right-auto sm:mb-2 sm:w-56 sm:-translate-x-1/2">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${raritaClass(emblema.rarita)}`}>{emblema.rarita}</p>
        <p className="mt-1 text-xs font-black uppercase">{emblema.titolo}</p>
        <p className="mt-2 text-[11px] font-semibold leading-4 text-white/60">{emblema.descrizione}</p>
      </div>
    </div>
  );
}

export default function EmblemiSocieta({
  sbloccati,
  daDifendere,
}: {
  sbloccati: EmblemaVisuale[];
  daDifendere: EmblemaVisuale[];
}) {
  const [open, setOpen] = useState(false);
  const ordinati = [...sbloccati].sort(
    (a, b) => ordineRarita.indexOf(a.rarita) - ordineRarita.indexOf(b.rarita)
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-500">Collezione ufficiale</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-blue-950">Emblemi</h2>
          </div>
          {ordinati.length > 6 && (
            <button type="button" onClick={() => setOpen(true)} className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-950 transition hover:text-blue-700">Vedi tutti</button>
          )}
        </div>

        {ordinati.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-1">
            {ordinati.slice(0, 6).map((emblema) => <Emblema key={emblema.chiave} emblema={emblema} />)}
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-slate-400">Nessun emblema sbloccato.</p>
        )}
      </div>

      <div className="rounded-[2rem] border border-amber-200/70 bg-[linear-gradient(145deg,#fffdf7,#ffffff)] p-4 shadow-lg shadow-amber-100/40 sm:p-6">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">Collezione Ufficiale</p>
        <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-blue-950">Emblemi Da difendere</h2>
        {daDifendere.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-1">
            {daDifendere.map((emblema) => <Emblema key={emblema.chiave} emblema={emblema} />)}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/70 px-4 py-4 text-sm font-semibold leading-6 text-slate-500 shadow-sm">
            Nessun emblema da difendere conquistato.
          </p>
        )}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Tutti gli emblemi" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-md sm:p-5" onMouseDown={() => setOpen(false)}>
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/15 bg-[#f8fbff] p-4 shadow-2xl sm:max-h-[85dvh] sm:rounded-[2rem] sm:p-9" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-5 sm:gap-6 sm:pb-6">
              <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-500 sm:text-[10px] sm:tracking-[0.24em]">Collezione completa</p><h2 className="mt-2 text-xl font-black uppercase text-blue-950 sm:text-3xl">Tutti gli emblemi</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-950 shadow-sm transition hover:border-blue-300">Chiudi</button>
            </div>
            <div className="mt-7 space-y-8">
              {ordineRarita.map((rarita) => {
                const gruppo = ordinati.filter((emblema) => emblema.rarita === rarita);
                if (gruppo.length === 0) return null;
                return <section key={rarita}><div className="mb-3 flex items-center gap-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{rarita}</p><span className="h-px flex-1 bg-slate-200" /></div><div className="flex flex-wrap gap-3">{gruppo.map((emblema) => <Emblema key={emblema.chiave} emblema={emblema} grande />)}</div></section>;
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
