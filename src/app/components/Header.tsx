"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ProfileAvatar from "@/app/account/ProfileAvatar";
import { logoutAction } from "@/app/account/actions";
import type { AccountViewer } from "@/lib/account/server";

type MenuKey = "play" | "records" | "rules";
const directLinks = [
  { href: "/", label: "Home", text: "Pagina principale", section: "home" },
  { href: "/campionati-live-preview", label: "Campionati", text: "Risultati e classifiche", section: "championships" },
  { href: "/coppe", label: "Coppa Fanta a 20", text: "Risultati e classifiche", section: "cups" },
  { href: "/societa", label: "Società", text: "Le 100 protagoniste", section: "clubs" },
] as const;
const menus = {
  play: { label: "Gioca", text: "FantaBet e Arcade", hub: "/giochi", links: [{ href: "/fantabet", label: "FantaBet", description: "Pronostici e classifica" }, { href: "/gioca", label: "Arcade", description: "Il runner Fanta a 20" }] },
  records: { label: "Record", text: "Storia e prestigio", hub: "/record", links: [{ href: "/statistiche#ranking", label: "Ranking", description: "Classifica storica" }, { href: "/statistiche#hall-of-fame", label: "Hall of Fame", description: "Record e protagonisti" }, { href: "/emblemi", label: "Emblemi", description: "La collezione ufficiale" }] },
  rules: { label: "Regolamento", text: "Regole e competizioni", hub: "/regole", links: [{ href: "/competizioni", label: "Competizioni", description: "Struttura di campionati e coppe" }, { href: "/regolamento", label: "Regolamento generale", description: "Regole del Fanta a 20" }] },
} as const;
const mobileLinks = [...directLinks.map(({ href, label, text }) => ({ href, label, text })), ...Object.values(menus).map(({ hub, label, text }) => ({ href: hub, label, text }))];

function isMobileLinkActive(href: string, active: ReturnType<typeof activeNavigationSection>) {
  if (href === "/giochi") return active === "play";
  if (href === "/record") return active === "records";
  if (href === "/regole") return active === "rules";
  return directLinks.some((item) => item.href === href && item.section === active);
}

export function activeNavigationSection(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/campionati")) return "championships";
  if (pathname.startsWith("/coppe")) return "cups";
  if (pathname.startsWith("/societa")) return "clubs";
  if (["/fantabet", "/gioca", "/giochi"].some((path) => pathname.startsWith(path))) return "play";
  if (["/ranking", "/hall-of-fame", "/statistiche", "/emblemi", "/record"].some((path) => pathname.startsWith(path))) return "records";
  if (["/competizioni", "/regolamento", "/regole"].some((path) => pathname.startsWith(path))) return "rules";
  return null;
}

export default function Header({ account }: { account: AccountViewer | null }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const lastScroll = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const skipMobileScrollRestore = useRef(false);
  const active = activeNavigationSection(pathname);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenu(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => {
    function onScroll() { if (scrollFrame.current !== null) return; scrollFrame.current = requestAnimationFrame(() => { const current = scrollY; setHidden(current > lastScroll.current && current > 120); if (current < 40) setHidden(false); lastScroll.current = current; scrollFrame.current = null; }); }
    addEventListener("scroll", onScroll, { passive: true }); return () => { removeEventListener("scroll", onScroll); if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current); };
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    skipMobileScrollRestore.current = false;
    const currentScroll = window.scrollY; const body = document.body;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.overflow = "hidden"; body.style.position = "fixed"; body.style.top = `-${currentScroll}px`; body.style.width = "100%";
    return () => { Object.assign(body.style, previous); if (!skipMobileScrollRestore.current) window.scrollTo(0, currentScroll); };
  }, [mobileOpen]);

  const navClass = "rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-blue-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";
  const profileHref = account?.username ? `/user/${encodeURIComponent(account.username)}` : "/account";
  const closeMobileMenuForNavigation = () => { skipMobileScrollRestore.current = true; setMobileOpen(false); };

  return <>
    <header ref={rootRef} className={`fixed inset-x-0 top-0 z-[90] border-b border-white/50 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm shadow-slate-200/40 backdrop-blur-2xl transition-transform duration-300 lg:sticky lg:bg-white/75 lg:pt-0 ${hidden ? "translate-y-0 lg:-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
        <Link href="/" aria-label="Vai alla Home" onClick={() => { setMobileOpen(false); setOpenMenu(null); }} className="group shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"><Image src="/logos/logo.png?v=20260730-1606" alt="Fanta a 20" width={48} height={48} unoptimized className="h-9 w-auto drop-shadow-sm transition duration-300 group-hover:scale-105 sm:h-11" /></Link>
        <div className="flex shrink-0 items-center gap-2">
        <nav aria-label="Navigazione principale" className="hidden items-center gap-1 text-sm font-bold text-slate-600 lg:flex">
          {directLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)} aria-current={active === item.section ? "page" : undefined} className={navClass}>{item.label}</Link>)}
          {(Object.entries(menus) as [MenuKey, (typeof menus)[MenuKey]][]).map(([key, menu]) => <div key={key} className="relative" onMouseEnter={() => setOpenMenu(key)} onMouseLeave={() => setOpenMenu((current) => current === key ? null : current)}><Link href={menu.hub} aria-expanded={openMenu === key} aria-controls={`desktop-${key}-menu`} onClick={() => setOpenMenu(null)} className={navClass}>{menu.label}</Link><div id={`desktop-${key}-menu`} className={`absolute left-1/2 top-full z-50 ${key === "records" ? "w-[280px]" : "w-[260px]"} -translate-x-1/2 pt-2 transition-all duration-200 ${openMenu === key ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}><div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">{menu.links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)} className="block rounded-[1rem] px-4 py-3 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"><p className="text-sm font-black uppercase tracking-tight text-blue-950">{item.label}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{item.description}</p></Link>)}</div></div></div>)}
        </nav>
          <button type="button" aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"} aria-expanded={mobileOpen} aria-controls="mobile-main-menu" onClick={() => setMobileOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-blue-950 shadow-sm lg:hidden"><span className="flex w-5 flex-col gap-1.5">{[0,1,2].map((line) => <span key={line} className={`h-0.5 w-full bg-current transition ${mobileOpen && line === 0 ? "translate-y-2 rotate-45" : mobileOpen && line === 1 ? "opacity-0" : mobileOpen && line === 2 ? "-translate-y-2 -rotate-45" : ""}`} />)}</span></button>
          {account ? <><Link href={profileHref} aria-label="Apri il profilo" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"><ProfileAvatar username={account.username ?? "Account"} avatarUrl={account.avatarUrl} size="header" /></Link><form action={logoutAction} className="hidden lg:block"><button className="rounded-full px-2 py-2 text-[11px] font-black uppercase text-slate-600 transition hover:text-blue-950">Logout</button></form></> : <Link href="/account/accedi" className="inline-flex min-h-11 items-center rounded-full bg-blue-950 px-4 text-xs font-black uppercase text-white">Accedi</Link>}
        </div>
      </div>
    </header>
    <nav id="mobile-main-menu" aria-label="Navigazione mobile" className={`fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[80] border-t border-slate-200/70 bg-white/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl backdrop-blur-xl transition duration-200 lg:hidden ${mobileOpen ? "visible translate-y-0 overflow-y-auto overscroll-contain opacity-100" : "invisible pointer-events-none -translate-y-2 opacity-0"}`}><div className="mx-auto flex min-h-full max-w-2xl flex-col"><div className="grid gap-3 sm:grid-cols-2">{mobileLinks.map((item) => <Link key={item.href} href={item.href} onClick={closeMobileMenuForNavigation} aria-current={isMobileLinkActive(item.href, active) ? "page" : undefined} className="flex min-h-14 min-w-0 flex-col justify-center rounded-[1.1rem] border border-slate-100 bg-slate-50/80 px-4 py-3 transition active:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"><span className="truncate text-sm font-black uppercase text-blue-950">{item.label}</span><span className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.text}</span></Link>)}</div>{account && <form action={logoutAction} className="mt-auto border-t border-slate-200 pt-4"><button className="min-h-12 w-full rounded-[1.1rem] bg-blue-950 px-5 text-center text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_10px_24px_-14px_rgba(7,31,69,.9)] transition active:scale-[.99] active:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">Logout</button></form>}</div></nav>
  </>;
}
