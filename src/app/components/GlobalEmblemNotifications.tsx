"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { emblemNotificationStorageKey, parseNotifiedEmblemIds, pendingEmblemNotifications, type EmblemNotification } from "@/lib/account/emblem-notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const aura = {
  comune: "border-sky-200 bg-sky-50 text-sky-700 shadow-sky-300/25",
  raro: "border-slate-300 bg-slate-50 text-slate-600 shadow-slate-300/35",
  epico: "border-red-200 bg-red-50 text-red-700 shadow-red-400/25",
  leggendario: "border-amber-300 bg-amber-50 text-amber-700 shadow-amber-400/30",
} as const;

export default function GlobalEmblemNotifications({ profileId, initialEmblems }: { profileId: string; initialEmblems: EmblemNotification[] }) {
  const pathname = usePathname();
  const panel = useRef<HTMLElement>(null);
  const [queue, setQueue] = useState<EmblemNotification[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const storageKey = emblemNotificationStorageKey(profileId);

  const reconcile = useCallback((emblems: EmblemNotification[]) => {
    const stored = parseNotifiedEmblemIds(localStorage.getItem(storageKey));
    if (stored === null) { localStorage.setItem(storageKey, JSON.stringify(emblems.map((emblem) => emblem.id))); return; }
    setQueue((current) => { const known = new Set([...stored, ...current.map((emblem) => emblem.id)]); return [...current, ...pendingEmblemNotifications(emblems, known)]; });
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) reconcile(initialEmblems); });
    getSupabaseBrowserClient().rpc("public_profile_user_emblems", { p_profile_id: profileId }).then(({ data }) => {
      if (!active) return;
      reconcile((data ?? []).flatMap((row) => row.unlocked && row.asset_path ? [{ id: Number(row.id), name: row.nome, rarity: row.rarita as EmblemNotification["rarity"], description: row.descrizione, imageUrl: row.asset_path }] : []));
    });
    return () => { active = false; };
  }, [initialEmblems, pathname, profileId, reconcile]);
  useEffect(() => {
    const update = () => setOnboardingOpen(Boolean(document.querySelector("[data-global-onboarding]")));
    update(); const observer = new MutationObserver(update); observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const current = !onboardingOpen ? queue[0] : undefined;
  const continueQueue = useCallback(() => {
    if (!current) return;
    const stored = parseNotifiedEmblemIds(localStorage.getItem(storageKey)) ?? new Set<number>(); stored.add(current.id);
    localStorage.setItem(storageKey, JSON.stringify([...stored])); setQueue((items) => items.slice(1));
  }, [current, storageKey]);
  useEffect(() => {
    if (!current) return; panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); continueQueue(); return; }
      if (event.key !== "Tab") return;
      const button = panel.current?.querySelector<HTMLElement>("button"); if (!button) return;
      event.preventDefault(); button.focus();
    };
    document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown);
  }, [continueQueue, current]);
  if (!current) return null;

  return <div data-global-emblem-notification role="dialog" aria-modal="true" aria-label={`Nuovo emblema sbloccato: ${current.name}`} className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/75 p-3 backdrop-blur-sm"><section ref={panel} tabIndex={-1} className={`flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border p-5 text-center shadow-2xl outline-none sm:p-7 ${aura[current.rarity]}`}><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-950">Nuovo emblema sbloccato!</p><div className="mx-auto mt-4 grid h-48 w-48 shrink-0 place-items-center"><Image src={current.imageUrl} alt={current.name} width={192} height={192} className="h-full w-full object-contain drop-shadow-[0_0_24px_currentColor]" /></div><h2 className="mt-4 text-2xl font-black uppercase text-blue-950">{current.name}</h2><p className="mt-1 text-xs font-black uppercase tracking-[.18em]">{current.rarity}</p><p className="mt-4 min-h-0 overflow-y-auto text-sm font-semibold leading-6 text-slate-600">{current.description}</p><button type="button" onClick={continueQueue} className="mt-5 min-h-12 shrink-0 rounded-xl bg-blue-950 px-5 text-xs font-black uppercase text-white">Continua</button></section></div>;
}
