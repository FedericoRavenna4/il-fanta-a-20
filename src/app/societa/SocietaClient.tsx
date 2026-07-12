"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Societa } from "@/lib/societa";

function getHighlight() {
  return {
    border: "border-slate-200",
    glow:
      "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.20),transparent_58%)]",
    light: "group-hover:bg-amber-300/30",
    logo: "group-hover:drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]",
  };
}

export default function SocietaClient({ societa }: { societa: Societa[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tutte");

  const filtered = societa
    .filter((team) => {
      const searchText =
        `${team.nome} ${team.fantallenatore} ${team.nicknameInstagram} ${team.squadraReale}`.toLowerCase();

      const matchSearch = searchText.includes(search.toLowerCase());

      const matchFilter =
        filter === "Tutte" ||
        team.legaAttuale === filter ||
        team.legaAttuale === filter;

      return matchSearch && matchFilter;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filters = [
    "Tutte",
    "Serie A",
    "Serie B",
    "Serie C - Girone A",
    "Serie C - Girone B",
    "Serie C - Girone C",
  ];

  return (
    <>
      <div className="mb-12">
        <input
          type="text"
          placeholder="Cerca società, fantallenatore o nickname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mx-auto block min-h-12 w-full max-w-3xl rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-base text-slate-700 shadow-lg outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-blue-900 focus:shadow-xl sm:px-6 sm:py-5 sm:text-lg"
        />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`min-h-11 rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${
                filter === item
                  ? "bg-blue-950 text-white shadow-lg shadow-blue-950/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-900 hover:text-blue-900 hover:shadow-md"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
        {filtered.map((team) => {
          const highlight = getHighlight();

          return (
            <Link
              key={team.id}
              href={`/societa/${team.slug}`}
              title={team.nome}
              className="group flex flex-col items-center"
            >
              <div
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1rem] border bg-white p-1 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-amber-300 group-hover:shadow-[0_18px_42px_rgba(15,23,42,0.16),0_0_30px_rgba(251,191,36,0.22)] sm:rounded-[1.45rem] sm:p-0 ${highlight.border}`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 ${highlight.glow}`}
                />

                <div
                  className={`pointer-events-none absolute h-24 w-24 rounded-full bg-amber-300/0 blur-3xl transition-all duration-300 ${highlight.light}`}
                />

                <Image
                  src={team.logo}
                  alt={team.nome}
                  width={90}
                  height={90}
                  className={`relative z-10 max-h-[68px] max-w-[72px] object-contain drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)] transition-all duration-300 group-hover:scale-[1.04] sm:max-h-[92px] sm:max-w-[98px] ${highlight.logo}`}
                />
              </div>

              <h2 className="mt-2 line-clamp-2 min-h-8 px-0.5 text-center text-[11px] font-black uppercase leading-4 tracking-tight text-blue-950 transition-colors duration-300 group-hover:text-blue-900 sm:mt-3 sm:h-8 sm:px-1">
                {team.nome}
              </h2>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-5 py-12 text-center shadow-sm">
          <h2 className="text-lg font-black uppercase text-blue-950">Nessuna società trovata</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">Prova con un altro nome, fantallenatore o nickname, oppure cambia il filtro selezionato.</p>
        </div>
      )}
    </>
  );
}
