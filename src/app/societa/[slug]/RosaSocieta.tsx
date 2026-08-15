"use client";

import { useState } from "react";
import type { RosaGiocatore } from "@/lib/rose";
import type { StatisticheGiocatore } from "@/lib/statisticheGiocatori";

const ruoli = [
  {
    keys: ["POR", "P"],
    title: "Portieri",
    short: "P",
    color: "bg-orange-500",
    card: "border-orange-300 bg-gradient-to-br from-orange-100 via-orange-50 to-white",
  },
  {
    keys: ["DIF", "D"],
    title: "Difensori",
    short: "D",
    color: "bg-green-600",
    card: "border-green-300 bg-gradient-to-br from-green-100 via-green-50 to-white",
  },
  {
    keys: ["CEN", "C"],
    title: "Centrocampisti",
    short: "C",
    color: "bg-blue-600",
    card: "border-sky-300 bg-gradient-to-br from-sky-100 via-blue-50 to-white",
  },
  {
    keys: ["ATT", "A"],
    title: "Attaccanti",
    short: "A",
    color: "bg-red-600",
    card: "border-red-300 bg-gradient-to-br from-red-100 via-red-50 to-white",
  },
];

function normalizzaRuolo(ruolo: string) {
  return ruolo.trim().toUpperCase();
}

function normalizzaNome(nome: string) {
  return nome.trim().toLowerCase();
}

function formatStat(value: number | null) {
  if (value === null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function trovaStatistiche(
  player: RosaGiocatore,
  statistiche: StatisticheGiocatore[]
) {
  const stessoNomeEStagione = statistiche.filter(
    (stat) =>
      stat.stagione === player.stagione &&
      normalizzaNome(stat.giocatore) === normalizzaNome(player.giocatore)
  );

  if (stessoNomeEStagione.length === 1) {
    return stessoNomeEStagione[0];
  }

  return stessoNomeEStagione.find(
    (stat) => normalizzaNome(stat.squadra) === normalizzaNome(player.squadraReale)
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon?: string;
  label?: string;
  value: string;
}) {
  return (
    <span className="flex min-w-0 items-center justify-start gap-0.5 rounded-md bg-white/55 px-1 py-0.5 sm:shrink-0 sm:gap-1 sm:rounded-none sm:border-r sm:border-slate-300/60 sm:bg-transparent sm:px-0 sm:py-0 sm:pr-2 sm:last:border-r-0 sm:last:pr-0">
      {icon && <span className="text-[10px] leading-none sm:text-[15px]">{icon}</span>}
      {label && (
        <span className="text-[8px] font-black uppercase text-slate-500 sm:text-[11px]">
          {label}
        </span>
      )}
      <span className="text-[10px] font-black text-blue-950 sm:text-[14px]">{value}</span>
    </span>
  );
}

export default function RosaSocieta({
  rosa,
  isNewEntry,
  statistiche,
}: {
  rosa: RosaGiocatore[];
  isNewEntry: boolean;
  statistiche: StatisticheGiocatore[];
}) {
  const stagioniDisponibili = Array.from(
    new Set(rosa.map((player) => player.stagione))
  ).sort((a, b) => b.localeCompare(a));

  const stagioni = isNewEntry
    ? ["2026/27"]
    : ["2026/27", ...stagioniDisponibili.filter((s) => s !== "2026/27")];

  const [stagione, setStagione] = useState("2026/27");

  const rosaFiltrata = rosa.filter((player) => player.stagione === stagione);

  const costoMassimo =
    rosaFiltrata.length > 0
      ? Math.max(...rosaFiltrata.map((player) => player.costo))
      : 0;

  return (
    <div className="mt-7 min-w-0 rounded-[2rem] border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/70 sm:mt-10 sm:p-8">
      <div className="mb-4 flex flex-col items-stretch gap-3 border-b border-slate-100 pb-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-xs sm:tracking-[0.22em]">
            Rosa società
          </p>

          <h2 className="text-xl font-black tracking-tight text-blue-950 sm:text-2xl">
            Rosa
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            Elenco giocatori registrati per stagione.
          </p>
        </div>

        <select
          value={stagione}
          onChange={(e) => setStagione(e.target.value)}
          className="min-h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-950 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:min-h-12 sm:w-auto sm:px-5 sm:py-3"
        >
          {stagioni.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {rosaFiltrata.length > 0 ? (
        <div className="grid gap-3 sm:gap-5 lg:block lg:columns-2 lg:gap-5">
          {ruoli.map((ruolo) => {
            const giocatoriRuolo = rosaFiltrata
              .filter((player) => ruolo.keys.includes(normalizzaRuolo(player.ruolo)))
              .sort((a, b) => b.costo - a.costo);

            return (
              <div
                key={ruolo.short}
                className={`min-w-0 break-inside-avoid-column rounded-2xl border border-slate-100 bg-slate-50/90 p-2.5 shadow-inner shadow-white sm:p-4 lg:mb-5 ${ruolo.short === "C" ? "lg:[break-before:column]" : ""}`}
              >
                <div className="hidden sm:mb-4 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white shadow-sm sm:h-8 sm:w-8 sm:text-sm ${ruolo.color}`}
                    >
                      {ruolo.short}
                    </span>

                    <h3 className="text-sm font-black text-blue-950 sm:text-base">{ruolo.title}</h3>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-200">
                    {giocatoriRuolo.length}
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {giocatoriRuolo.map((player, index) => {
                    const acquistoPiuCaro =
                      costoMassimo > 0 && player.costo === costoMassimo;

                    const stats = trovaStatistiche(player, statistiche);
                    const isPortiere = ruolo.short === "P";

                    return (
                      <div
                        key={`${player.giocatore}-${index}`}
                          className={`min-w-0 rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-2xl ${stats ? "p-2 sm:px-4 sm:py-3" : "px-2 py-1.5 sm:px-4 sm:py-2"} ${
                          acquistoPiuCaro
                            ? "border-yellow-300 bg-gradient-to-br from-yellow-100 via-white to-white ring-2 ring-yellow-100"
                            : ruolo.card
                        }`}
                      >
                        {!stats ? (
  /* 2026/27 — card slim: RUOLO | NOME | COSTO */
  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-md sm:h-9 sm:w-9 sm:text-base ${ruolo.color}`}
    >
      {ruolo.short}
    </span>

    <p className="min-w-0 flex-1 text-sm font-black leading-tight text-blue-950 sm:text-[18px]">
      <span>{player.giocatore}</span>

      {player.squadraReale.trim() && (
        <span className="ml-1 whitespace-nowrap text-[10px] font-black uppercase text-blue-950/60 sm:ml-2 sm:text-[14px] sm:text-blue-950/80">
          ({player.squadraReale.trim()})
        </span>
      )}
    </p>

    <div className="flex shrink-0 items-center gap-1.5">
      {acquistoPiuCaro && (
        <div className="flex items-center gap-1 whitespace-nowrap text-yellow-700">
          <span
            role="img"
            aria-label="Giocatore più pagato"
            title="Giocatore più pagato"
            className="text-xs sm:text-base"
          >
            ⭐
          </span>

          <span className="hidden text-[8px] font-black uppercase sm:inline">
            Più caro
          </span>
        </div>
      )}

      <p className="text-lg font-black leading-none text-blue-950 sm:text-2xl">
        {player.costo}
      </p>
    </div>
  </div>
) : (
 <>
  <div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-1 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:gap-x-1.5">
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-md sm:h-9 sm:w-9 sm:text-base ${ruolo.color}`}
    >
      {ruolo.short}
    </span>

    <p className="min-w-0 justify-self-start text-sm font-black leading-tight text-blue-950 sm:text-[18px]">
      <span>{player.giocatore}</span>

      {player.squadraReale.trim() && (
        <span className="ml-1 whitespace-nowrap text-[10px] font-black uppercase text-blue-950/60 sm:ml-2 sm:text-[14px] sm:text-blue-950/80">
          ({player.squadraReale.trim()})
        </span>
      )}
    </p>

    <div className="flex shrink-0 items-center justify-end gap-1.5">
      {acquistoPiuCaro && (
        <div className="flex items-center gap-1 whitespace-nowrap text-yellow-700">
          <span
            role="img"
            aria-label="Giocatore più pagato"
            title="Giocatore più pagato"
            className="text-xs sm:text-base"
          >
            ⭐
          </span>

          <span className="hidden text-[8px] font-black uppercase sm:inline">
            Più caro
          </span>
        </div>
      )}

      <p className="text-lg font-black leading-none text-blue-950 sm:text-2xl">
        {player.costo}
      </p>
    </div>

    <div className="col-start-2 col-span-2 mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-x-2">
      <StatItem label="PG" value={formatStat(stats.partite)} />

      {isPortiere ? (
        <>
          <StatItem icon="🧤" value={formatStat(stats.cleanSheet)} />
          <StatItem icon="🥅" value={formatStat(stats.golSubiti)} />
          <StatItem icon="🧱" value={formatStat(stats.rigoriParati)} />
        </>
      ) : (
        <>
          <StatItem icon="⚽" value={formatStat(stats.golFatti)} />
          <StatItem icon="👟" value={formatStat(stats.assist)} />
          <StatItem icon="🟨" value={formatStat(stats.ammonizioni)} />
          <StatItem icon="🟥" value={formatStat(stats.espulsioni)} />
        </>
      )}

      <StatItem label="FM" value={formatStat(stats.fantaMedia)} />
    </div>
  </div>
</>
)}
                      </div>
                    );
                  })}

                  {giocatoriRuolo.length === 0 && (
                    <p className="rounded-xl bg-white p-3 text-sm font-semibold text-slate-400 ring-1 ring-slate-100">
                      Nessun giocatore.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <h3 className="text-xl font-black text-blue-950">
            Rosa {stagione} ancora da costruire
          </h3>

          <p className="mt-2 text-slate-500">
            La rosa verrà pubblicata dopo la composizione ufficiale della
            stagione.
          </p>
        </div>
      )}
    </div>
  );
}
