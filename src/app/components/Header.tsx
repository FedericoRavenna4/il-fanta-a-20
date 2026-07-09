"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const statisticheLinks = [
  {
    href: "/ranking",
    title: "Ranking",
    text: "Classifica storica",
  },
  {
    href: "/hall-of-fame",
    title: "Hall of Fame",
    text: "Record e protagonisti",
  },
];

const competizioniLinks = [
  {
    href: "/campionati",
    title: "Campionati",
    text: "Serie A, Serie B, Serie C",
  },
  {
    href: "/coppe",
    title: "Coppe",
    text: "Trofei ufficiali",
  },
  {
    href: "/scatto-promozione",
    title: "Lo Scatto Promozione",
    text: "La novità della Serie C",
  },
];

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [lastScroll, setLastScroll] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;

      if (current < 40) {
        setHidden(false);
      } else if (current > lastScroll && current > 120) {
        setHidden(true);
        setOpenMenu(null);
      } else if (current < lastScroll) {
        setHidden(false);
      }

      setLastScroll(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScroll]);

  function closeMenu() {
    setOpenMenu(null);
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/50 bg-white/75 shadow-sm shadow-slate-200/40 backdrop-blur-2xl transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" onClick={closeMenu} className="group flex items-center gap-3">
          <Image
            src="/logos/logo.png"
            alt="Fanta a 20"
            width={48}
            height={48}
            className="h-11 w-auto drop-shadow-sm transition duration-300 group-hover:scale-105 group-hover:drop-shadow-md"
          />

          <span className="text-lg font-black uppercase tracking-tight text-blue-950">
            Il Fanta a 20
          </span>
        </Link>

        <nav className="hidden items-center gap-2 text-sm font-bold text-slate-600 md:flex">
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
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                openMenu === "statistiche"
                  ? "bg-blue-950 text-white"
                  : "hover:bg-blue-950 hover:text-white"
              }`}
            >
              Statistiche
            </button>

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
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                openMenu === "competizioni"
                  ? "bg-blue-950 text-white"
                  : "hover:bg-blue-950 hover:text-white"
              }`}
            >
              Competizioni
            </button>

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
      </div>
    </header>
  );
}