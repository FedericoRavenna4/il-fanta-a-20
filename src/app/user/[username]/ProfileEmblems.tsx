"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type ProfileEmblem = { id: number; name: string; imageUrl: string | null; rarity: "comune" | "raro" | "epico" | "leggendario"; category: string; description: string; status: "unlocked" | "locked" | "secret"; unlockedAt: string | null };
type Modal = "owned" | "locked" | null;

const rarityAura = {
  comune: "before:bg-sky-300/35 text-sky-700",
  raro: "before:bg-slate-300/50 text-slate-500",
  epico: "before:bg-red-400/35 text-red-700",
  leggendario: "before:bg-amber-300/45 text-amber-700",
} as const;
const rarityOrder = ["comune", "raro", "epico", "leggendario"] as const;
const secretSilhouettes: Record<number, string> = {
  6: "/emblemi-utenti/silhouettes/secret-6.png",
  10: "/emblemi-utenti/silhouettes/secret-10.png",
  17: "/emblemi-utenti/silhouettes/secret-17.png",
  19: "/emblemi-utenti/silhouettes/secret-19.png",
};

function EmblemItem({ emblem, onSelect }: { emblem: ProfileEmblem; onSelect: (emblem: ProfileEmblem) => void }) {
  const secret = emblem.status === "secret";
  return <button type="button" data-emblem-status={emblem.status} onClick={() => onSelect(emblem)} className={`group min-w-0 text-center ${rarityAura[emblem.rarity]}`}>
    <span className="relative mx-auto grid aspect-square w-full max-w-28 place-items-center before:absolute before:inset-[18%] before:-z-0 before:rounded-full before:blur-xl before:content-['']">
      {secret
        ? <span aria-label="Emblema segreto" className="relative z-10 grid h-full w-full place-items-center"><Image src={secretSilhouettes[emblem.id] ?? "/emblemi-utenti/silhouettes/secret-6.png"} alt="" width={112} height={112} className="h-full w-full object-contain opacity-90 drop-shadow-[0_8px_12px_rgba(15,23,42,.35)]" /><span aria-hidden="true" className="absolute grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-slate-950/75 text-2xl font-black text-white shadow-lg">?</span></span>
        : !emblem.imageUrl
        ? <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-slate-900" />
        : <Image src={emblem.imageUrl} alt={emblem.name} width={112} height={112} className={`relative z-10 h-full w-full object-contain drop-shadow-[0_10px_12px_rgba(15,23,42,.18)] transition-transform group-hover:-translate-y-0.5 ${emblem.status === "locked" ? "brightness-[.12] grayscale contrast-125 opacity-85" : ""}`} />}
    </span>
    <strong className="mt-1 block truncate text-[10px] font-black uppercase text-blue-950 sm:text-xs">{secret ? "Emblema segreto" : emblem.name}</strong>
    <span className="mt-0.5 block text-[8px] font-black uppercase tracking-[.14em]">{emblem.rarity}</span>
  </button>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm"><section ref={panel} tabIndex={-1} className="relative max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-[radial-gradient(circle_at_top,#fff_0%,#f4f8ff_68%)] p-5 shadow-2xl outline-none sm:p-8"><header className="flex items-center justify-between gap-4 pr-10"><h3 className="text-lg font-black uppercase text-blue-950 sm:text-2xl">{title}</h3><button type="button" onClick={onClose} aria-label="Chiudi" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-blue-950 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:right-5 sm:top-5"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button></header>{children}</section></div>;
}

export default function ProfileEmblems({ emblems }: { emblems: ProfileEmblem[] }) {
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<ProfileEmblem | null>(null);
  const unlocked = useMemo(() => emblems.filter((emblem) => emblem.status === "unlocked"), [emblems]);
  const locked = useMemo(() => emblems.filter((emblem) => emblem.status !== "unlocked"), [emblems]);
  if (!emblems.length) return <p className="mt-4 text-sm font-semibold text-slate-500">Nessun emblema disponibile</p>;

  const grid = (items: ProfileEmblem[]) => <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">{items.map((emblem) => <EmblemItem key={emblem.id} emblem={emblem} onSelect={setSelected} />)}</div>;
  return <>
    <p data-user-emblem-count className="mt-2 text-xs font-bold text-slate-500">Emblemi sbloccati: <strong className="text-base font-black text-blue-950">{unlocked.length}</strong></p>
    <div data-owned-emblem-showcase className="mt-6">{unlocked.length ? grid(unlocked.slice(0, 6)) : <p className="py-5 text-center text-sm font-semibold text-slate-500">La tua collezione inizierà dal primo emblema sbloccato.</p>}</div>
    <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">{unlocked.length > 6 && <button type="button" onClick={() => setModal("owned")} className="min-h-10 rounded-full bg-blue-950 px-6 text-[10px] font-black uppercase tracking-wide text-white">Mostra altri</button>}<button type="button" onClick={() => setModal("locked")} className="min-h-10 rounded-full border border-sky-200 bg-sky-50 px-6 text-[10px] font-black uppercase tracking-wide text-blue-950">Mostra tutti gli emblemi da sbloccare</button></div>

    {modal === "owned" && <ModalShell title="Emblemi sbloccati" onClose={() => setModal(null)}><div className="mt-7">{grid(unlocked)}</div></ModalShell>}
    {modal === "locked" && <ModalShell title="Emblemi da sbloccare" onClose={() => setModal(null)}><div className="mt-7 space-y-8">{rarityOrder.map((rarity) => { const items = locked.filter((emblem) => emblem.rarity === rarity); return items.length ? <section key={rarity}><h4 className={`mb-4 text-xs font-black uppercase tracking-[.18em] ${rarityAura[rarity].split(" ").at(-1)}`}>{rarity}</h4>{grid(items)}</section> : null; })}</div></ModalShell>}
    {selected && <ModalShell title={selected.status === "secret" ? "Emblema segreto" : selected.name} onClose={() => setSelected(null)}><div className="mx-auto max-w-sm py-5 text-center"><EmblemItem emblem={selected} onSelect={() => undefined} />{selected.status !== "secret" && <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{selected.description}</p>}{selected.status === "unlocked" && selected.unlockedAt && <time dateTime={selected.unlockedAt} className="mt-3 block text-xs font-bold text-slate-400">Sbloccato il {new Intl.DateTimeFormat("it-IT").format(new Date(selected.unlockedAt))}</time>}</div></ModalShell>}
  </>;
}
