"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function TifosiSocieta({ count, usernames }: { count: number; usernames: string[] | null }) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="w-full rounded-2xl bg-slate-50 p-3 text-center transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:p-6">
      <span className="block text-sm font-bold uppercase tracking-[.08em] text-slate-500">Tifosi</span>
      <span className="block text-3xl font-black tabular-nums text-blue-950">{count}</span>
    </button>
    {open && <div className="fixed inset-0 z-[120] grid place-items-center overflow-x-hidden bg-blue-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="supporters-title" className="flex max-h-[min(78vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-2xl shadow-blue-950/30">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="supporters-title" className="text-xl font-black uppercase tracking-tight text-blue-950">I tifosi</h2>
          <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Chiudi elenco tifosi" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-lg font-black text-blue-950 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-500">×</button>
        </header>
        <div className="min-w-0 overflow-y-auto overflow-x-hidden px-5 py-4">
          {usernames === null ? <p className="text-sm font-semibold text-slate-500">Elenco dei tifosi non ancora disponibile.</p> : usernames.length === 0 ? <p className="text-sm font-semibold text-slate-500">Nessun tifoso al momento.</p> : <ul className="divide-y divide-slate-100">{usernames.map((username) => <li key={username} className="min-w-0 py-3"><Link href={`/user/${encodeURIComponent(username)}`} className="block truncate text-sm font-black text-blue-950 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-500">{username}</Link></li>)}</ul>}
        </div>
      </section>
    </div>}
  </>;
}
