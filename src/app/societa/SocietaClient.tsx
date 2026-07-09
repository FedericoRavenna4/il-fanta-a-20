"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Societa } from "@/lib/societa";

function getHighlight(team: Societa) {
  const baseGlow = {
    glow:
      "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.20),transparent_58%)]",
    light: "group-hover:bg-amber-300/30",
    logo: "group-hover:drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]",
  };

  if (team.badgeCampioneSerieA) {
    return {
      border:
        "border-sky-400 shadow-[0_0_0_1px_rgba(56,189,248,.45),0_0_28px_rgba(56,189,248,.22)]",
      ...baseGlow,
    };
  }

  if (team.id === 42) {
    return {
      border:
        "border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,.50),0_0_30px_rgba(251,191,36,.26)]",
      ...baseGlow,
    };
  }

  if (team.leader) {
    return {
      border:
        "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,.45),0_0_30px_rgba(239,68,68,.24)]",
      ...baseGlow,
    };
  }

  return {
    border: "border-slate-200",
    ...baseGlow,
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
          className="mx-auto block w-full max-w-3xl rounded-[1.25rem] border border-slate-200 bg-white px-6 py-5 text-lg text-slate-700 shadow-lg outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-blue-900 focus:shadow-xl"
        />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 ${
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

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
        {filtered.map((team) => {
          const highlight = getHighlight(team);

          return (
            <Link
              key={team.id}
              href={`/societa/${team.slug}`}
              title={team.nome}
              className="group flex flex-col items-center"
            >
              <div
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.45rem] border bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-amber-300 group-hover:shadow-[0_18px_42px_rgba(15,23,42,0.16),0_0_30px_rgba(251,191,36,0.22)] ${highlight.border}`}
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
                  className={`relative z-10 max-h-[92px] max-w-[98px] object-contain drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)] transition-all duration-300 group-hover:scale-[1.04] ${highlight.logo}`}
                />
              </div>

              <h2 className="mt-3 px-1 text-center text-[11px] font-black uppercase leading-[1.4] tracking-tight text-blue-950 transition-all duration-300 ease-out group-hover:tracking-normal group-hover:text-blue-900 group-hover:drop-shadow-[0_2px_8px_rgba(30,64,175,0.18)]">
                {team.nome}
              </h2>
            </Link>
          );
        })}
      </div>
    </>
  );
}