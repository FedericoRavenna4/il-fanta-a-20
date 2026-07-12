"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const statisticheLinks = [
  {
    href: "/statistiche#ranking",
    title: "Ranking",
    text: "Classifica storica",
  },
  {
    href: "/statistiche#hall-of-fame",
    title: "Hall of Fame",
    text: "Record e protagonisti",
  },
];

const competizioniLinks = [
  {
    href: "/competizioni#campionati",
    title: "Campionati",
    text: "Serie A, Serie B, Serie C",
  },
  {
    href: "/competizioni#coppe",
    title: "Coppe",
    text: "Trofei ufficiali",
  },
  {
    href: "/competizioni#scatto-promozione",
    title: "Lo Scatto Promozione",
    text: "La novità della Serie C",
  },
];

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;

      if (current < 40) {
        setHidden(false);
      } else if (current > lastScroll.current && current > 120) {
        setHidden(true);
        setOpenMenu(null);
      } else if (current < lastScroll.current) {
        setHidden(false);
      }

      lastScroll.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  function closeMenu() {
    setOpenMenu(null);
    setMobileOpen(false);
  }

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-[90] border-b border-white/50 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm shadow-slate-200/40 backdrop-blur-2xl transition-transform duration-300 lg:sticky lg:bg-white/75 lg:pt-0 ${
        hidden ? "translate-y-0 lg:-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
        <Link href="/" onClick={closeMenu} className="group flex items-center gap-3">
          <Image
            src="/logos/logo.png"
            alt="Fanta a 20"
            width={48}
            height={48}
            className="h-9 w-auto drop-shadow-sm transition duration-300 group-hover:scale-105 group-hover:drop-shadow-md sm:h-11"
          />

          <span className="text-base font-black uppercase tracking-tight text-blue-950 sm:text-lg">
            Il Fanta a 20
          </span>
        </Link>

        <nav className="hidden items-center gap-2 text-sm font-bold text-slate-600 lg:flex">
          <Link
            href="/"
            onClick={closeMenu}
            className="rounded-full px-4 py-2 transition hover:bg-blue-950 hover:text-white"
          >
            Home
          </Link>

          <Link
            href="/societa"
            onClick={closeMenu}
            className="rounded-full px-4 py-2 transition hover:bg-blue-950 hover:text-white"
          >
            Società
          </Link>

          <div
            className="relative"
            onMouseEnter={() => setOpenMenu("statistiche")}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <Link
              href="/statistiche"
              onClick={closeMenu}
              className={`rounded-full px-4 py-2 transition ${
                openMenu === "statistiche"
                  ? "bg-blue-950 text-white"
                  : "hover:bg-blue-950 hover:text-white"
              }`}
            >
              Statistiche
            </Link>

            <div
              className={`absolute left-1/2 top-full z-50 w-[260px] -translate-x-1/2 pt-2 transition-all duration-200 ${
                openMenu === "statistiche"
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">
                {statisticheLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="block rounded-[1rem] px-4 py-3 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-black uppercase tracking-tight text-blue-950">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {item.text}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative"
            onMouseEnter={() => setOpenMenu("competizioni")}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <Link
              href="/competizioni"
              onClick={closeMenu}
              className={`rounded-full px-4 py-2 transition ${
                openMenu === "competizioni"
                  ? "bg-blue-950 text-white"
                  : "hover:bg-blue-950 hover:text-white"
              }`}
            >
              Competizioni
            </Link>

            <div
              className={`absolute left-1/2 top-full z-50 w-[280px] -translate-x-1/2 pt-2 transition-all duration-200 ${
                openMenu === "competizioni"
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">
                {competizioniLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="block rounded-[1rem] px-4 py-3 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-black uppercase tracking-tight text-blue-950">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {item.text}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/regolamento"
            onClick={closeMenu}
            className="rounded-full px-4 py-2 transition hover:bg-blue-950 hover:text-white"
          >
            Regolamento
          </Link>
        </nav>

        <button
          type="button"
          aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-blue-950 shadow-sm lg:hidden"
        >
          <span className="sr-only">Menu</span>
          <span className="flex w-5 flex-col gap-1.5">
            <span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-full bg-current transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>
    </header>

      <nav className={`fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[80] border-t border-slate-200/70 bg-white/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl backdrop-blur-xl transition duration-200 lg:hidden ${mobileOpen ? "visible translate-y-0 overflow-y-auto overscroll-contain opacity-100" : "invisible pointer-events-none -translate-y-2 opacity-0"}`}>
        <div className="mx-auto grid min-h-full max-w-2xl content-start gap-3 sm:grid-cols-2">
          {[
            { href: "/", title: "Home", text: "Il portale ufficiale" },
            { href: "/societa", title: "Società", text: "Le 100 protagoniste" },
            { href: "/statistiche", title: "Statistiche", text: "Ranking e Hall of Fame" },
            { href: "/competizioni", title: "Competizioni", text: "Campionati, coppe e promozioni" },
            { href: "/regolamento", title: "Regolamento", text: "Le regole ufficiali" },
          ].map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu} className="flex min-h-14 flex-col justify-center rounded-[1.1rem] border border-slate-100 bg-slate-50/80 px-4 py-3 active:bg-sky-50">
              <p className="text-sm font-black uppercase text-blue-950">{item.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.text}</p>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
