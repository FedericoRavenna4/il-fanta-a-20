"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Societa } from "@/lib/societa";

export default function SocietaClient({ societa }: { societa: Societa[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tutte");

  const filtered = societa.filter((team) => {
    const searchText = `
      ${team.nome}
      ${team.fantallenatore}
      ${team.nicknameInstagram}
      ${team.squadraReale}
    `.toLowerCase();

    const matchSearch = searchText.includes(search.toLowerCase());

    const matchFilter =
      filter === "Tutte" ||
      team.legaAttuale === filter ||
      (filter === "Serie C" && team.legaAttuale.startsWith("Serie C"));

    return matchSearch && matchFilter;
  });

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
      <div className="mb-6">
        <input
          type="text"
          placeholder="Cerca società, fantallenatore o nickname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-slate-700 outline-none focus:border-blue-900"
        />
      </div>

      <div className="mb-10 flex flex-wrap gap-3">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              filter === item
                ? "bg-blue-950 text-white"
                : "border border-slate-200 text-slate-600 hover:border-blue-900 hover:text-blue-900"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((team) => (
          <Link
            key={team.id}
            href={`/societa/${team.slug}`}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition block"
          >
            <div className="h-28 flex items-center justify-center mb-5">
              <Image
                src={team.logo}
                alt={team.nome}
                width={110}
                height={110}
                className="max-h-28 w-auto object-contain"
              />
            </div>

            <h2 className="text-xl font-bold text-blue-950">
              {team.nome}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {team.legaAttuale}
            </p>

            {team.leader && (
              <p className="mt-3 inline-block rounded-full bg-blue-950 px-3 py-1 text-xs font-semibold text-white">
                👑 Leader Ranking
              </p>
            )}

            <p className="mt-4 text-sm font-semibold text-blue-900">
              #{team.ranking} Ranking
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}