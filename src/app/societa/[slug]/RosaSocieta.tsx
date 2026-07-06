"use client";

import { useState } from "react";
import type { RosaGiocatore } from "@/lib/rose";

const ruoli = [
  { keys: ["POR", "P"], title: "Portieri", short: "P", color: "bg-orange-500" },
  { keys: ["DIF", "D"], title: "Difensori", short: "D", color: "bg-green-600" },
  { keys: ["CEN", "C"], title: "Centrocampisti", short: "C", color: "bg-blue-600" },
  { keys: ["ATT", "A"], title: "Attaccanti", short: "A", color: "bg-red-600" },
];

function normalizzaRuolo(ruolo: string) {
  return ruolo.trim().toUpperCase();
}

export default function RosaSocieta({
  rosa,
  isNewEntry,
}: {
  rosa: RosaGiocatore[];
  isNewEntry: boolean;
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
    <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">Rosa</h2>
          <p className="text-slate-500">
            Elenco giocatori registrati per stagione.
          </p>
        </div>

        <select
          value={stagione}
          onChange={(e) => setStagione(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-blue-950 outline-none"
        >
          {stagioni.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {rosaFiltrata.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-4">
          {ruoli.map((ruolo) => {
            const giocatoriRuolo = rosaFiltrata.filter((player) =>
              ruolo.keys.includes(normalizzaRuolo(player.ruolo))
            );

            return (
              <div
                key={ruolo.short}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-black text-white ${ruolo.color}`}
                  >
                    {ruolo.short}
                  </span>

                  <h3 className="font-bold text-blue-950">{ruolo.title}</h3>
                </div>

                <div className="space-y-3">
                  {giocatoriRuolo.map((player, index) => {
                    const acquistoPiuCaro =
                      costoMassimo > 0 && player.costo === costoMassimo;

                    return (
                      <div
                        key={`${player.giocatore}-${index}`}
                        className={`rounded-xl border bg-white p-3 shadow-sm ${
                          acquistoPiuCaro
                            ? "border-yellow-300"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-blue-950">
                              {player.giocatore}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {player.squadraReale}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-blue-950">
                              {player.costo}
                            </p>

                            {acquistoPiuCaro && (
                              <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-600">
                                ⭐ Più caro
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {giocatoriRuolo.length === 0 && (
                    <p className="rounded-xl bg-white p-3 text-sm text-slate-400">
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
          <h3 className="text-xl font-bold text-blue-950">
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