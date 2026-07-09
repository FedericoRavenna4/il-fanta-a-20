"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type RankingRow = {
  posizione: number;
  squadraId: number;
  nomeRanking: string;
  puntiRanking: string | number;
  team: {
    id: number;
    nome: string;
    slug: string;
    logo: string;
    legaAttuale: string;
    fantallenatore: string;
    nicknameInstagram: string;
  } | null;
  trofei: {
    totaleTrofei: number;
  };
};

type SortKey = "posizione" | "nome" | "punti" | "trofei";
type SortDirection = "asc" | "desc";

function puntiNumber(value: string | number) {
  return Number(String(value).replace(",", ".")) || 0;
}

function posizioneLabel(posizione: number) {
  return `${posizione}°`;
}

function getFascia(posizione: number) {
  if (posizione <= 20) return { label: "1ª Fascia", range: "Posizioni 1-20" };
  if (posizione <= 40) return { label: "2ª Fascia", range: "Posizioni 21-40" };
  if (posizione <= 60) return { label: "3ª Fascia", range: "Posizioni 41-60" };
  if (posizione <= 80) return { label: "4ª Fascia", range: "Posizioni 61-80" };
  return { label: "5ª Fascia", range: "Posizioni 81-100" };
}

function shouldShowFasciaHeader(
  current: RankingRow,
  index: number,
  rows: RankingRow[]
) {
  if (index === 0) return true;

  const previous = rows[index - 1];

  return getFascia(current.posizione).label !== getFascia(previous.posizione).label;
}

export default function RankingClient({ rows }: { rows: RankingRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("posizione");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const leader = rows[0];
  const inseguitrici = rows.slice(1, 3);

  function handleSort(key: SortKey) {
    if (sort === key) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSort(key);
    setDirection(key === "nome" ? "asc" : "desc");

    if (key === "posizione") {
      setDirection("asc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sort !== key) return "↕";
    return direction === "asc" ? "↑" : "↓";
  }

  const classificaFiltrata = useMemo(() => {
    return rows
      .filter((row) => {
        const searchText = `
          ${row.team?.nome ?? row.nomeRanking}
          ${row.team?.fantallenatore ?? ""}
          ${row.team?.nicknameInstagram ?? ""}
          ${row.team?.legaAttuale ?? ""}
        `.toLowerCase();

        return searchText.includes(search.toLowerCase());
      })
      .sort((a, b) => {
        let result = 0;

        if (sort === "posizione") {
          result = a.posizione - b.posizione;
        }

        if (sort === "nome") {
          result = (a.team?.nome ?? a.nomeRanking).localeCompare(
            b.team?.nome ?? b.nomeRanking
          );
        }

        if (sort === "punti") {
          result = puntiNumber(b.puntiRanking) - puntiNumber(a.puntiRanking);
        }

        if (sort === "trofei") {
          result = b.trofei.totaleTrofei - a.trofei.totaleTrofei;
        }

        if (direction === "desc" && sort !== "punti" && sort !== "trofei") {
          return result * -1;
        }

        if (direction === "asc" && (sort === "punti" || sort === "trofei")) {
          return result * -1;
        }

        return result;
      });
  }, [rows, search, sort, direction]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-12">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-slate-400">
          Classifica storica
        </p>

        <h1 className="mb-5 text-6xl font-black tracking-tight text-blue-950">
          Ranking
        </h1>

        <p className="max-w-6xl text-lg leading-8 text-slate-600">
          La graduatoria storica delle società del Fanta a 20. I punti ranking
          vengono assegnati in base ai trofei conquistati e ai risultati
          ottenuti nelle competizioni ufficiali, costruendo stagione dopo
          stagione la classifica che misura il valore storico di ogni società.
        </p>
      </div>

      {leader?.team && (
        <Link
          href={`/societa/${leader.team.slug}`}
          className="group mb-10 block overflow-hidden rounded-[2rem] border border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-50 text-blue-950 shadow-2xl shadow-amber-200/70 transition hover:-translate-y-1"
        >
          <div className="grid items-center gap-8 p-8 lg:grid-cols-[1fr_340px] lg:p-10">
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-amber-800">
  ⭐ Ranking Leader
</p>

              <h2 className="text-5xl font-black leading-tight">
                {leader.team.nome}
              </h2>

              <p className="mt-4 font-semibold text-amber-900">
                La società numero uno nella storia del Fanta a 20.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/75 p-5 ring-1 ring-amber-300">
                  <p className="text-sm font-bold text-amber-800">Posizione</p>
                  <p className="text-3xl font-black">1°</p>
                </div>

                <div className="rounded-2xl bg-white/75 p-5 ring-1 ring-amber-300">
                  <p className="text-sm font-bold text-amber-800">Punti</p>
                  <p className="text-3xl font-black">{leader.puntiRanking}</p>
                </div>

                <div className="rounded-2xl bg-white/75 p-5 ring-1 ring-amber-300">
                  <p className="text-sm font-bold text-amber-800">Trofei</p>
                  <p className="text-3xl font-black">
                    {leader.trofei.totaleTrofei}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-sm font-black text-blue-950 opacity-0 transition group-hover:opacity-100">
                Vai alla scheda →
              </p>
            </div>

            <div className="flex items-center justify-center p-6">
  <Image
    src={leader.team.logo}
    alt={leader.team.nome}
    width={300}
height={300}
    className="max-h-72 w-auto object-contain drop-shadow-[0_18px_28px_rgba(30,41,59,0.35)] transition group-hover:scale-105"
  />
</div>
          </div>
        </Link>
      )}

      <div className="mb-12 grid gap-6 md:grid-cols-2">
        {inseguitrici.map((row) => (
          <Link
            key={row.posizione}
            href={row.team ? `/societa/${row.team.slug}` : "#"}
            className={`group relative flex h-[300px] flex-col overflow-hidden rounded-[1.75rem] border p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-2xl ${
             row.posizione === 2
  ? "border-slate-400 bg-gradient-to-br from-slate-300 via-slate-100 to-white shadow-slate-300"
                : "border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-white shadow-orange-100"
            }`}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/75 text-3xl ring-1 ring-slate-200">
              {row.posizione === 2 ? "🥈" : "🥉"}
            </div>

            {row.team && (
              <div className="flex h-[112px] items-center justify-center">
                <Image
                  src={row.team.logo}
                  alt={row.team.nome}
                  width={130}
                  height={130}
                  className="max-h-[105px] w-auto object-contain transition group-hover:scale-105"
                />
              </div>
            )}

            <div className="mt-4 flex min-h-[50px] items-center justify-center">
              <h3 className="line-clamp-2 text-balance text-[21px] font-extrabold uppercase leading-tight text-blue-950">
                {row.team?.nome ?? row.nomeRanking}
              </h3>
            </div>

            <div className="mt-auto flex justify-center gap-2">
              <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                {posizioneLabel(row.posizione)}
              </span>

              <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                {row.puntiRanking} punti
              </span>

              <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                {row.trofei.totaleTrofei} trofei
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/70">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-blue-950">
                Classifica completa
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {classificaFiltrata.length} società trovate
              </p>
            </div>

            <input
              type="text"
              placeholder="Cerca società, fantallenatore o nickname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-900 lg:max-w-md"
            />
          </div>
        </div>

        <div className="hidden grid-cols-[90px_1fr_130px_110px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
          <button
            onClick={() => handleSort("posizione")}
            className="text-left transition hover:text-blue-950"
          >
            Pos {sortIcon("posizione")}
          </button>

          <button
            onClick={() => handleSort("nome")}
            className="text-left transition hover:text-blue-950"
          >
            Squadra {sortIcon("nome")}
          </button>

          <button
            onClick={() => handleSort("punti")}
            className="text-right transition hover:text-blue-950"
          >
            Punti {sortIcon("punti")}
          </button>

          <button
            onClick={() => handleSort("trofei")}
            className="text-right transition hover:text-blue-950"
          >
            Trofei {sortIcon("trofei")}
          </button>
        </div>

        <div>
          {classificaFiltrata.map((row, index) => {
  const fascia = getFascia(row.posizione);

  return (
    <div key={row.posizione}>
      {sort === "posizione" &&
        shouldShowFasciaHeader(row, index, classificaFiltrata) && (
          <div className="px-6 pt-8 pb-3">
            <div className="rounded-[1.75rem] border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 px-6 py-4 shadow-md shadow-sky-100/80">
              <h3 className="text-2xl font-black tracking-tight text-blue-950">
                {fascia.label}
              </h3>

              <div className="my-3 h-[5px] w-64 rounded-full bg-gradient-to-r from-blue-950 via-sky-500 to-transparent" />

              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                {fascia.range}
              </p>
            </div>
          </div>
        )}

      <Link
        href={row.team ? `/societa/${row.team.slug}` : "#"}
        className="grid gap-4 px-6 py-4 transition hover:bg-sky-50/70 md:grid-cols-[90px_minmax(0,1fr)_130px_110px] md:items-center"
      >
        <div className="flex items-center gap-3 md:block">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-lg font-black text-blue-950 ring-1 ring-slate-200">
            {posizioneLabel(row.posizione)}
          </div>

          {sort === "posizione" && (
            <span className="rounded-full bg-blue-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white md:hidden">
              {fascia.label}
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center">
            {row.team && (
              <Image
                src={row.team.logo}
                alt={row.team.nome}
                width={56}
                height={56}
                className="max-h-14 max-w-14 object-contain"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-black uppercase text-blue-950">
              {row.team?.nome ?? row.nomeRanking}
            </h3>

            <p className="text-sm font-semibold text-slate-500">
              {row.team?.legaAttuale}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:block md:text-right">
          <p className="text-xs font-bold uppercase text-slate-400 md:hidden">
            Punti
          </p>

          <p className="text-xl font-black text-blue-950">
            {row.puntiRanking}
          </p>
        </div>

        <div className="flex items-center justify-between md:block md:text-right">
          <p className="text-xs font-bold uppercase text-slate-400 md:hidden">
            Trofei
          </p>

          <p className="text-xl font-black text-blue-950">
            {row.trofei.totaleTrofei}
          </p>
        </div>
      </Link>
    </div>
  );
})}
        </div>
      </div>
    </section>
  );
}