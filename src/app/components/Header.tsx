"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProfileAvatar from "@/app/account/ProfileAvatar";
import { logoutAction } from "@/app/account/actions";
import type { AccountViewer } from "@/lib/account/server";

const mainLinks = [
  { href: "/", title: "Home", text: "Il portale ufficiale" },
  { href: "/campionati-live-preview", title: "Campionati", text: "Risultati e classifiche" },
  { href: "/societa", title: "Società", text: "Le 100 protagoniste" },
  { href: "/fantabet", title: "FantaBet", text: "Pronostici e classifica globale" },
];

function ProfileButton({ account, onClick }: { account: AccountViewer; onClick: () => void }) {
  const username = account.username;
  return <Link href={username ? `/user/${encodeURIComponent(username)}` : "/account"} onClick={onClick} aria-label="Apri il tuo profilo" className="shrink-0 rounded-full outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"><ProfileAvatar username={username ?? "Account"} avatarUrl={account.avatarUrl} size="header" /></Link>;
}

export default function Header({ account }: { account: AccountViewer | null }) {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScroll = useRef(0);
  const scrollFrame = useRef<number | null>(null);

  useEffect(() => {
    function onScroll() {
      if (scrollFrame.current !== null) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        if (current < 40) setHidden(false);
        else if (current > lastScroll.current && current > 120) setHidden(true);
        else if (current < lastScroll.current) setHidden(false);
        lastScroll.current = current;
        scrollFrame.current = null;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const scrollY = window.scrollY; const body = document.body;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.overflow = "hidden"; body.style.position = "fixed"; body.style.top = `-${scrollY}px`; body.style.width = "100%";
    return () => { Object.assign(body.style, previous); window.scrollTo(0, scrollY); };
  }, [mobileOpen]);

  function closeMenu() { setMobileOpen(false); }

  return <>
    <header className={`fixed inset-x-0 top-0 z-[90] border-b border-white/50 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm shadow-slate-200/40 backdrop-blur-2xl transition-transform duration-300 lg:sticky lg:bg-white/75 lg:pt-0 ${hidden ? "translate-y-0 lg:-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link href="/" onClick={closeMenu} className="group shrink-0"><Image src="/logos/logo.png?v=20260730-1606" alt="Fanta a 20" width={48} height={48} unoptimized className="h-9 w-auto drop-shadow-sm transition duration-300 group-hover:scale-105 sm:h-11" /></Link>
        <nav aria-label="Navigazione principale" className="hidden items-center gap-1 text-sm font-bold text-slate-600 lg:flex">{mainLinks.map((item) => <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 transition hover:bg-blue-950 hover:text-white">{item.title}</Link>)}</nav>
        <div className="flex shrink-0 items-center gap-2">
          {account ? <ProfileButton account={account} onClick={closeMenu} /> : <div className="hidden items-center gap-1 lg:flex"><Link href="/account/accedi" className="rounded-full px-3 py-2 text-sm font-bold text-blue-950">Accedi</Link><Link href="/account/registrati" className="rounded-full bg-blue-950 px-4 py-2 text-sm font-bold text-white">Registrati</Link></div>}
          <button type="button" aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"} aria-expanded={Boolean(mobileOpen)} onClick={() => setMobileOpen((current) => !current)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-blue-950 shadow-sm lg:hidden"><span className="sr-only">Menu</span><span className="flex w-5 flex-col gap-1.5"><span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} /><span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} /><span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} /></span></button>
        </div>
      </div>
    </header>
    <nav aria-label="Navigazione mobile" className={`fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[80] border-t border-slate-200/70 bg-white/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl backdrop-blur-xl transition duration-200 lg:hidden ${mobileOpen ? "visible translate-y-0 overflow-y-auto overscroll-contain opacity-100" : "invisible pointer-events-none -translate-y-2 opacity-0"}`}>
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-3"><div className="grid gap-3 sm:grid-cols-2">{mainLinks.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu} className="flex min-h-14 min-w-0 flex-col justify-center rounded-[1.1rem] border border-slate-100 bg-slate-50/80 px-4 py-3 active:bg-sky-50"><p className="truncate text-sm font-black uppercase text-blue-950">{item.title}</p><p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.text}</p></Link>)}</div><div data-mobile-account-menu className="mt-auto border-t border-slate-200 pt-4">{account ? <form action={logoutAction}><button type="submit" className="flex min-h-14 w-full items-center justify-center rounded-[1.1rem] border border-blue-950 font-black uppercase text-blue-950">Logout</button></form> : <div className="grid grid-cols-2 gap-3"><Link href="/account/accedi" onClick={closeMenu} className="flex min-h-14 items-center justify-center rounded-[1.1rem] border border-blue-950 font-black uppercase text-blue-950">Accedi</Link><Link href="/account/registrati" onClick={closeMenu} className="flex min-h-14 items-center justify-center rounded-[1.1rem] bg-blue-950 font-black uppercase text-white">Registrati</Link></div>}</div></div>
    </nav>
  </>;
}
