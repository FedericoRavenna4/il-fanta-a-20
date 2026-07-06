"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Societa } from "@/lib/societa";

function getLegaBadge(lega: string) {
  if (lega === "Serie A") return "bg-sky-100 text-sky-700 border-sky-200";
  if (lega === "Serie B") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (lega.startsWith("Serie C")) return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function getLegaShortName(lega: string) {
  if (lega === "Serie A") return "Serie A";
  if (lega === "Serie B") return "Serie B";
  if (lega.startsWith("Serie C")) return "Serie C";
  return lega;
}

export default function SocietaClient({ societa }: { societa: Societa[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tutte");

  const filtered = societa
    .filter((team) => {
      const searchText = `${team.nome} ${team.fantallenatore} ${team.nicknameInstagram} ${team.squadraReale}`.toLowerCase();

      const matchSearch = searchText.includes(search.toLowerCase());

      const matchFilter =
        filter === "Tutte" ||
        team.legaAttuale === filter ||
        (filter === "Serie C" && team.legaAttuale.startsWith("Serie C"));

      return matchSearch && matchFilter;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filters = [
    "Tutte",
    "Serie A",
    "Serie B",
    "Serie C",
    "Serie C - Girone A",
    "Serie C - Girone B",
    "Serie C - Girone C",
  ];

  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="Cerca società, fantallenatore o nickname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-slate-700 shadow-sm outline-none focus:border-blue-900"
        />

        <div className="flex flex-wrap gap-3">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                filter === item
                  ? "bg-blue-950 text-white shadow-md"
                  : "bg-white/85 border border-slate-200 text-slate-600 hover:border-blue-900 hover:text-blue-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((team) => {
          const legaBadge = getLegaBadge(team.legaAttuale);
          const legaShortName = getLegaShortName(team.legaAttuale);

          return (
            <Link
              key={team.id}
              href={`/societa/${team.slug}`}
              className="group relative flex h-[330px] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white px-6 pb-6 pt-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl"
            >
              <div className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold ${legaBadge}`}>
                {legaShortName}
              </div>

              {team.leader && (
  <div className="absolute right-[-58px] top-[24px] rotate-45 bg-red-500/90 px-14 py-2 text-[10px] font-semibold tracking-wide text-white shadow-md">
    ⭐ Ranking Leader
  </div>
)}

              {team.badgeNewEntry && (
  <div className="absolute right-[-58px] top-[24px] rotate-45 bg-sky-400/90 px-14 py-2 text-[10px] font-semibold tracking-wide text-white shadow-md">
    🆕 New Entry
  </div>
)}

              {team.badgeCampioneSerieA && (
  <div className="absolute right-[-58px] top-[24px] rotate-45 bg-amber-400/90 px-14 py-2 text-[10px] font-semibold tracking-wide text-white shadow-md">
    🏆 Campione
  </div>
)}

              <div className="flex h-[132px] w-full items-center justify-center pt-5">
                <div className="flex h-[112px] w-[128px] items-center justify-center">
                  <Image
                    src={team.logo}
                    alt={team.nome}
                    width={128}
                    height={128}
                    className="max-h-[108px] max-w-[118px] object-contain transition group-hover:scale-105"
                  />
                </div>
              </div>

              <div className="mt-4 flex h-[64px] items-start justify-center text-center">
                <h2 className="line-clamp-2 max-w-full text-center text-balance text-[20px] font-extrabold uppercase leading-tight text-blue-950">
                  {team.nome}
                </h2>
              </div>

              <div className="flex h-[26px] items-start justify-center text-center">
                <p className="line-clamp-1 max-w-full text-center text-sm text-slate-500">
                  {team.fantallenatore}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}