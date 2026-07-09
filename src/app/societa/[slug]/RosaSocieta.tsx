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
    <span className="flex shrink-0 items-center gap-1.5 border-r border-slate-300/60 pr-2 last:border-r-0 last:pr-0">
      {icon && <span className="text-[15px] leading-none">{icon}</span>}
      {label && (
        <span className="text-[11px] font-black uppercase text-slate-500">
          {label}
        </span>
      )}
      <span className="text-[14px] font-black text-blue-950">{value}</span>
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
    <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/70 sm:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Rosa società
          </p>

          <h2 className="text-2xl font-black tracking-tight text-blue-950">
            Rosa
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Elenco giocatori registrati per stagione.
          </p>
        </div>

        <select
          value={stagione}
          onChange={(e) => setStagione(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-blue-950 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          {stagioni.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {rosaFiltrata.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {ruoli.map((ruolo) => {
            const giocatoriRuolo = rosaFiltrata
              .filter((player) => ruolo.keys.includes(normalizzaRuolo(player.ruolo)))
              .sort((a, b) => b.costo - a.costo);

            return (
              <div
                key={ruolo.short}
                className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 shadow-inner shadow-white"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white shadow-sm ${ruolo.color}`}
                    >
                      {ruolo.short}
                    </span>

                    <h3 className="font-black text-blue-950">{ruolo.title}</h3>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-200">
                    {giocatoriRuolo.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {giocatoriRuolo.map((player, index) => {
                    const acquistoPiuCaro =
                      costoMassimo > 0 && player.costo === costoMassimo;

                    const stats = trovaStatistiche(player, statistiche);
                    const isPortiere = ruolo.short === "P";

                    return (
                      <div
                        key={`${player.giocatore}-${index}`}
                        className={`rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                          acquistoPiuCaro
                            ? "border-yellow-300 bg-gradient-to-br from-yellow-100 via-white to-white ring-2 ring-yellow-100"
                            : ruolo.card
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow-md ${ruolo.color}`}
                            >
                              {ruolo.short}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-[18px] font-black leading-tight text-blue-950">
                                {player.giocatore}
                                <span className="ml-2 text-[14px] font-black uppercase text-blue-950/80">
                                  ({player.squadraReale})
                                </span>
                              </p>

                              {stats && (
                                <div className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pr-2">
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
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
  {acquistoPiuCaro && (
    <div className="-ml-2 flex w-[46px] flex-col items-center leading-none">
      <span className="text-base drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]">
        ⭐
      </span>

      <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.04em] text-yellow-700">
        Più caro
      </span>
    </div>
  )}

  <p className="w-10 text-right text-2xl font-black leading-none text-blue-950">
    {player.costo}
  </p>
</div>
                        </div>
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