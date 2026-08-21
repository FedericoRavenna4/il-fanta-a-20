"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { emblemNotificationStorageKey, parseNotifiedEmblemIds, pendingEmblemNotifications, type EmblemNotification, type SocietaEmblemNotification } from "@/lib/account/emblem-notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const aura = {
  comune: "border-sky-200 bg-sky-50 text-sky-700 shadow-sky-300/25",
  raro: "border-slate-300 bg-slate-50 text-slate-600 shadow-slate-300/35",
  epico: "border-red-200 bg-red-50 text-red-700 shadow-red-400/25",
  leggendario: "border-amber-300 bg-amber-50 text-amber-700 shadow-amber-400/30",
} as const;

type QueueItem = (EmblemNotification & { kind: "user" }) | (SocietaEmblemNotification & { kind: "societa" });

export default function GlobalEmblemNotifications({ profileId, initialEmblems, initialSocietaEmblems }: { profileId: string; initialEmblems: EmblemNotification[]; initialSocietaEmblems: SocietaEmblemNotification[] }) {
  const pathname = usePathname();
  const panel = useRef<HTMLElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>(() => initialSocietaEmblems.map((emblem) => ({ ...emblem, kind: "societa" })));
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const storageKey = emblemNotificationStorageKey(profileId);

  const reconcile = useCallback((emblems: EmblemNotification[]) => {
    const stored = parseNotifiedEmblemIds(localStorage.getItem(storageKey));
    if (stored === null) { localStorage.setItem(storageKey, JSON.stringify(emblems.map((emblem) => emblem.id))); return; }
    setQueue((current) => { const known = new Set([...stored, ...current.filter((emblem) => emblem.kind === "user").map((emblem) => emblem.id)]); return [...current, ...pendingEmblemNotifications(emblems, known).map((emblem) => ({ ...emblem, kind: "user" as const }))]; });
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
  const continueQueue = useCallback(async () => {
    if (!current) return;
    if (current.kind === "societa") {
      const { error } = await getSupabaseBrowserClient().rpc("mark_my_societa_emblem_notification_seen", { p_notification_id: current.id });
      if (error) return;
    } else {
      const stored = parseNotifiedEmblemIds(localStorage.getItem(storageKey)) ?? new Set<number>(); stored.add(current.id);
      localStorage.setItem(storageKey, JSON.stringify([...stored]));
    }
    setQueue((items) => items.slice(1));
  }, [current, storageKey]);
  useEffect(() => {
    if (!current) return; panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); void continueQueue(); return; }
      if (event.key !== "Tab") return;
      const button = panel.current?.querySelector<HTMLElement>("button"); if (!button) return;
      event.preventDefault(); button.focus();
    };
    document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown);
  }, [continueQueue, current]);
  if (!current) return null;

  const heading = current.kind === "user"
    ? "Nuovo emblema sbloccato!"
    : current.audience === "supporter"
      ? "La squadra che tifi ha sbloccato un emblema"
      : "Emblema sbloccato";
  return <div data-global-emblem-notification role="dialog" aria-modal="true" aria-label={`${heading}: ${current.name}`} className="fixed inset-0 z-[130] grid place-items-center overflow-x-hidden bg-slate-950/75 p-3 backdrop-blur-sm"><section ref={panel} tabIndex={-1} className={`flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border p-4 text-center shadow-2xl outline-none min-[390px]:p-5 sm:p-7 ${aura[current.rarity]}`}><p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-950 min-[390px]:text-[11px] min-[390px]:tracking-[.2em]">{heading}</p>{current.kind === "societa" && <p className="mt-1 break-words text-sm font-black text-blue-950">{current.societaName}</p>}<div className="mx-auto mt-3 grid h-36 w-36 shrink place-items-center min-[390px]:h-44 min-[390px]:w-44 sm:mt-4 sm:h-48 sm:w-48"><Image src={current.imageUrl} alt={current.name} width={192} height={192} className="h-full w-full object-contain drop-shadow-[0_0_24px_currentColor]" /></div><h2 className="mt-3 break-words text-xl font-black uppercase text-blue-950 min-[390px]:text-2xl sm:mt-4">{current.name}</h2><p className="mt-1 text-xs font-black uppercase tracking-[.18em]">{current.rarity}</p><p className="mt-3 min-h-0 overflow-y-auto break-words text-sm font-semibold leading-6 text-slate-600 sm:mt-4">{current.description}</p><button type="button" onClick={() => void continueQueue()} className="mt-4 min-h-12 shrink-0 touch-manipulation rounded-xl bg-blue-950 px-5 text-xs font-black uppercase text-white sm:mt-5">Continua</button></section></div>;
}
