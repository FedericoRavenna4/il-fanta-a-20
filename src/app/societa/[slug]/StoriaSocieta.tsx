"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Risultato } from "@/lib/risultati";

const MIGLIOR_SECONDA_SERIE_C_ID = 25;

const trofeiIcone: Record<string, string> = {
  "Serie A": "/trofei/scudetto-a.png?v=20260713-1602",
  "Serie B": "/trofei/scudetto-b.png?v=20260713-1602",
  "Serie C": "/trofei/scudetto-c.png?v=20260713-1602",
  "Champions League": "/trofei/champions-league.png?v=20260713-1602",
  "Europa League": "/trofei/europa-league.png?v=20260713-1602",
  "Conference League": "/trofei/conference-league.png?v=20260713-1602",
  "Coppa Fanta a 20": "/trofei/coppa-fanta-a-20.png?v=20260713-1602",
};

function getTrofeoGlowClass(icona: string) {
  if (icona.includes("scudetto-b") || icona.includes("conference")) return "drop-shadow-[0_0_24px_rgba(52,211,153,0.7)]";
  if (icona.includes("scudetto-c")) return "drop-shadow-[0_0_24px_rgba(167,139,250,0.78)]";
  if (icona.includes("champions")) return "drop-shadow-[0_0_26px_rgba(147,197,253,0.78)]";
  if (icona.includes("europa")) return "drop-shadow-[0_0_24px_rgba(251,146,60,0.7)]";
  return "drop-shadow-[0_0_26px_rgba(251,191,36,0.82)]";
}

function posizioneNumero(value: string) {
  const numero = Number(value);
  return Number.isNaN(numero) ? null : numero;
}

function formatPosizione(value: string) {
  const numero = posizioneNumero(value);
  return numero ? `${numero}° posto` : value;
}

function formatFase(value: string) {
  return value
    .replace(/^eliminato agli?/i, "")
    .replace(/^eliminata agli?/i, "")
    .replace(/^in/i, "")
    .replace(/^eliminato ai/i, "")
    .replace(/^eliminata ai/i, "")
    .replace(/^eliminato al/i, "")
    .replace(/^eliminata al/i, "")
    .replace(/^eliminato/i, "")
    .replace(/^eliminata/i, "")
    .trim()
    .replace(/^Ottavi$/i, "Ottavi di Finale")
    .replace(/^Quarti$/i, "Quarti di Finale")
    .replace(/^Semifinale$/i, "Semifinale")
    .replace(/^Finale$/i, "Finale")
    .replace(/^2 turno playoff$/i, "2° Turno Playoff")
    .replace(/^2° turno playoff$/i, "2° Turno Playoff")
    .replace(/^3 turno playoff$/i, "3° Turno Playoff")
    .replace(/^3° turno playoff$/i, "3° Turno Playoff");
}

function isVittoria(item: Risultato) {
  const risultato = item.risultatoTesto.toLowerCase();

  return (
    item.risultatoTesto === "1" ||
    risultato === "vincitore" ||
    risultato === "vincitrice" ||
    risultato.includes("campione")
  );
}

function getTrofeoIcona(item: Risultato) {
  if (item.competizione === "Campionato") {
    if (item.lega === "Serie A") return trofeiIcone["Serie A"];
    if (item.lega === "Serie B") return trofeiIcone["Serie B"];
    if (item.lega.startsWith("Serie C")) return trofeiIcone["Serie C"];
  }

  return trofeiIcone[item.competizione];
}

function getCompetizioneTitolo(item: Risultato) {
  if (item.competizione === "Campionato") return item.lega;
  return item.competizione;
}

function getCompetizioneTitoloMobile(item: Risultato) {
  if (item.competizione === "Campionato") {
    if (item.lega.startsWith("Serie C")) return "Serie C";
    return item.lega;
  }

  if (item.competizione === "Champions League") return "Champions";
  if (item.competizione === "Europa League") return "Europa";
  if (item.competizione === "Conference League") return "Conference";
  if (item.competizione === "Coppa Fanta a 20") return "Coppa FA20";
  return item.competizione;
}
function getCategoriaRisultato(item: Risultato) {
  if (item.competizione === "Campionato") return "campionato";

  if (
    item.competizione === "Champions League" ||
    item.competizione === "Europa League" ||
    item.competizione === "Conference League"
  ) {
    return "europa";
  }

  if (item.competizione === "Coppa Fanta a 20") return "coppaFanta";

  return "altro";
}

function isDarkCard(item: Risultato) {
  return (
    item.competizione === "Champions League" ||
    item.competizione === "Europa League" ||
    item.competizione === "Conference League"
  );
}

function getCardStyle(item: Risultato, vittoria: boolean) {
  const goldWinner = vittoria
    ? " ring-2 ring-amber-300 shadow-amber-300/50"
    : "";

  if (item.competizione === "Campionato") {
    if (item.lega === "Serie A") {
      return `border-sky-300 bg-gradient-to-br from-sky-300 via-sky-100 to-white shadow-sky-200/80${goldWinner}`;
    }

    if (item.lega === "Serie B") {
      return `border-lime-300 bg-gradient-to-br from-lime-300 via-lime-100 to-white shadow-lime-200/80${goldWinner}`;
    }

    if (item.lega.startsWith("Serie C")) {
      return `border-violet-300 bg-gradient-to-br from-violet-300 via-violet-100 to-white shadow-violet-200/80${goldWinner}`;
    }
  }

  if (item.competizione === "Champions League") {
    return `border-blue-900/25 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-blue-950/30${goldWinner}`;
  }

  if (item.competizione === "Europa League") {
    return `border-orange-500/40 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-200 text-white shadow-orange-400/40${goldWinner}`;
  }

  if (item.competizione === "Conference League") {
    return `border-emerald-800/25 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white shadow-emerald-950/30${goldWinner}`;
  }

  if (item.competizione === "Coppa Fanta a 20") {
    return `border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-100 to-white shadow-amber-200/80${goldWinner}`;
  }

  return `border-slate-200 bg-white shadow-slate-100/60${goldWinner}`;
}

function formatRisultato(item: Risultato) {
  const risultato = item.risultatoTesto.trim();
  const lower = risultato.toLowerCase();

  if (item.competizione === "Campionato") {
    return formatPosizione(risultato);
  }

  if (item.competizione === "Coppa Fanta a 20") {
    if (lower.includes("qualificazione")) {
      const numero = risultato.match(/\d+/)?.[0];
      return numero ? `${numero}° posto` : risultato;
    }

    return formatFase(risultato);
  }

  if (lower.startsWith("girone")) {
    return "Gironi di qualificazione";
  }

  return formatFase(risultato);
}

function formatRisultatoMobile(item: Risultato, vittoria: boolean) {
  if (vittoria) return "VINCITORE";

  const risultato = item.risultatoTesto.trim();
  const lower = risultato.toLowerCase();

  if (item.competizione === "Campionato") {
    const numero = posizioneNumero(risultato);
    return numero ? `${numero}° POSTO` : risultato;
  }

  if (lower.includes("qualificazione")) {
    const numero = risultato.match(/\d+/)?.[0];
    return numero ? `${numero}° POSTO` : "GIRONI";
  }

  if (lower.startsWith("girone")) {
    const numero = risultato.match(/\d+/)?.[0];
    return numero ? `GIRONE ${numero}` : "GIRONI";
  }

  if (lower.includes("gironi")) return "GIRONI";
  if (lower.includes("trentadues")) return "TRENTADUES.";
  if (lower.includes("sedices")) return "SEDICESIMI";
  if (lower.includes("ottav")) return "OTTAVI";
  if (lower.includes("quart")) return "QUARTI";
  if (lower.includes("semifinale")) return "SEMIF.";
  if (lower.includes("final")) return "FINALE";

  return formatFase(risultato);
}

function descriviCampionato(item: Risultato, squadraId: number) {
  if (item.competizione !== "Campionato") return null;

  const posizione = posizioneNumero(item.risultatoTesto);
  if (!posizione) return null;

  if (posizione === 1) {
    if (item.lega === "Serie A") return "ha conquistato il campionato di Serie A";
    if (item.lega === "Serie B") return "ha vinto la Serie B e guadagnato la promozione in Serie A";
    if (item.lega.startsWith("Serie C")) return "ha vinto il proprio girone di Serie C e conquistato la promozione";
  }

  if (item.lega === "Serie B" && [2, 3].includes(posizione)) {
    return `ha chiuso al ${posizione}° posto in Serie B, ottenendo la promozione in Serie A`;
  }

  if (
    item.lega.startsWith("Serie C") &&
    squadraId === MIGLIOR_SECONDA_SERIE_C_ID &&
    posizione === 2
  ) {
    return "ha chiuso al 2° posto in Serie C, risultando la miglior seconda e conquistando la promozione";
  }

  return null;
}

function creaIntroduzione(
  nomeSocieta: string,
  risultati: Risultato[],
  squadraId: number,
  isNewEntry: boolean
) {
  if (isNewEntry || risultati.length === 0) {
    return `${nomeSocieta} è pronta a scrivere le prime pagine della propria storia nel Fanta a 20. Il percorso ufficiale inizierà con le prossime competizioni, tra aste, risultati e nuove rivalità da costruire stagione dopo stagione.`;
  }

  const stagioni = Array.from(new Set(risultati.map((item) => item.stagione))).sort();
  const primaStagione = stagioni[0];

  const eventi = risultati
    .map((item) => descriviCampionato(item, squadraId))
    .filter(Boolean) as string[];

  if (eventi.length > 0) {
    return `${nomeSocieta} è presente negli archivi ufficiali del Fanta a 20 dal ${primaStagione}. Tra i momenti più significativi, ${eventi.slice(0, 2).join(" e ")}.`;
  }

  return `${nomeSocieta} è presente negli archivi ufficiali del Fanta a 20 dal ${primaStagione}. La sua storia è raccontata dai piazzamenti in campionato e dai percorsi nelle coppe, stagione dopo stagione.`;
}

export default function StoriaSocieta({
  risultati,
  nomeSocieta,
  squadraId,
  isNewEntry,
  descrizioneEditoriale,
}: {
  risultati: Risultato[];
  nomeSocieta: string;
  squadraId: number;
  isNewEntry: boolean;
  descrizioneEditoriale?: string;
}) {
  const stagioniDisponibili = useMemo(() => {
    return Array.from(new Set(risultati.map((item) => item.stagione))).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [risultati]);

  const [stagioneSelezionata, setStagioneSelezionata] = useState("Tutto");
  const [menuStagioniAperto, setMenuStagioniAperto] = useState(false);

  const risultatiVisibili =
    stagioneSelezionata === "Tutto"
      ? risultati
      : risultati.filter((item) => item.stagione === stagioneSelezionata);

  const risultatiOrdinati = [...risultatiVisibili].sort((a, b) => {
    if (a.stagioneId !== b.stagioneId) return b.stagioneId - a.stagioneId;
    if (a.competizione === "Campionato") return -1;
    if (b.competizione === "Campionato") return 1;
    return a.competizione.localeCompare(b.competizione);
  });

  const risultatiRipuliti = risultatiOrdinati.filter((item) => {
    if (item.competizione !== "Coppa Fanta a 20") return true;

    const stessaStagione = risultatiOrdinati.filter(
      (altro) =>
        altro.stagioneId === item.stagioneId &&
        altro.competizione === "Coppa Fanta a 20"
    );

    const haFaseFinale = stessaStagione.some(
      (altro) =>
        !altro.risultatoTesto.toLowerCase().includes("qualificazione")
    );

    if (
      haFaseFinale &&
      item.risultatoTesto.toLowerCase().includes("qualificazione")
    ) {
      return false;
    }

    return true;
  });

  const risultatiPerStagione = risultatiRipuliti.reduce<
    Record<string, Risultato[]>
  >((acc, item) => {
    if (!acc[item.stagione]) acc[item.stagione] = [];
    acc[item.stagione].push(item);
    return acc;
  }, {});

  const introduzione =
    descrizioneEditoriale?.trim() ||
    creaIntroduzione(nomeSocieta, risultati, squadraId, isNewEntry);

  return (
    <>
      {!isNewEntry && (
        <section className="mt-7 rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-xl shadow-slate-200/60 sm:mt-10 sm:p-8">
          <div className="mb-5 max-sm:mb-4 sm:mb-8">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Archivio risultati
            </p>

            <h2 className="text-2xl font-black text-blue-950">
              Risultati storici
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Tutti i risultati ufficiali registrati stagione dopo stagione.
            </p>
          </div>

          {stagioniDisponibili.length > 0 && (
            <div className="relative mb-6 flex items-center justify-center max-sm:mb-4 sm:mb-10">
              <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-300 sm:block" />

              <div className="relative w-full max-w-[300px] sm:mx-6">
                <button
                  type="button"
                  onClick={() => setMenuStagioniAperto((open) => !open)}
                  className="flex w-full min-w-0 items-center justify-center gap-3 rounded-full border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-sky-50 px-4 py-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg max-sm:gap-2 max-sm:py-2 sm:min-w-[300px] sm:px-8"
                >
                  <span className="text-xl font-black tracking-tight text-blue-950 max-sm:text-base">
                    {stagioneSelezionata === "Tutto"
                      ? "Tutta la storia"
                      : stagioneSelezionata}
                  </span>

                  <span
                    className={`text-sm font-black text-sky-600 transition ${
                      menuStagioniAperto ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {menuStagioniAperto && (
                  <div className="absolute left-1/2 z-30 mt-3 w-full -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-[300px]">
                    <button
                      type="button"
                      onClick={() => {
                        setStagioneSelezionata("Tutto");
                        setMenuStagioniAperto(false);
                      }}
                      className="block w-full px-5 py-3 text-left text-sm font-black text-blue-950 transition hover:bg-sky-50"
                    >
                      Tutta la storia
                    </button>

                    {stagioniDisponibili.map((stagione) => (
                      <button
                        key={stagione}
                        type="button"
                        onClick={() => {
                          setStagioneSelezionata(stagione);
                          setMenuStagioniAperto(false);
                        }}
                        className="block w-full px-5 py-3 text-left text-sm font-black text-blue-950 transition hover:bg-sky-50"
                      >
                        {stagione}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-300 sm:block" />
            </div>
          )}

          {risultati.length > 0 ? (
            <div className="space-y-4 max-sm:space-y-4 sm:space-y-6">
              {Object.entries(risultatiPerStagione).map(([stagione, items]) => {
  const itemsOrdinati = [...items].sort((a, b) => {
    const ordine = (item: Risultato) => {
      if (item.competizione === "Campionato") return 0;

      if (
        item.competizione === "Champions League" ||
        item.competizione === "Europa League" ||
        item.competizione === "Conference League"
      ) {
        return 1;
      }

      if (item.competizione === "Coppa Fanta a 20") return 2;

      return 99;
    };

    return ordine(a) - ordine(b);
  });

  return (
                <div key={stagione} className="space-y-4 max-sm:space-y-2.5">
                  {stagioneSelezionata === "Tutto" && (
                    <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                      {stagione}
                    </h3>
                  )}

                  <div className="grid gap-4 max-sm:grid-cols-3 max-sm:gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                    {itemsOrdinati.map((item, index) => {
                      const risultato = formatRisultato(item);
                      const vittoria = isVittoria(item);
                      const icona = getTrofeoIcona(item);

                      return (
                        <div
                          key={`${item.stagioneId}-${item.competizione}-${index}`}
                          className={`group relative min-h-[84px] overflow-hidden rounded-[1.35rem] border px-4 py-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg max-sm:h-[88px] max-sm:min-h-0 max-sm:min-w-0 max-sm:rounded-xl max-sm:px-2.5 max-sm:py-2.5 max-sm:hover:translate-y-0 lg:h-[76px] lg:min-h-0 lg:px-5 ${getCardStyle(
  item,
  vittoria
)}`}
                        >
                          {vittoria && icona && (
                            <div className="pointer-events-none absolute right-2 top-1/2 hidden h-16 w-16 -translate-y-1/2 items-center justify-center sm:flex lg:right-2 lg:h-16 lg:w-16">
                              <Image
  unoptimized
  src={icona}
  alt="Trofeo"
  width={56}
  height={56}
  className={`h-auto max-h-14 w-auto max-w-14 object-contain transition duration-300 group-hover:scale-105 ${getTrofeoGlowClass(icona)}`}
/>
                            </div>
                          )}

                          <div className={`relative z-10 flex h-full min-w-0 flex-col justify-center max-sm:justify-between max-sm:max-w-full ${vittoria && icona ? "max-w-[calc(100%-4.5rem)] lg:max-w-[68%]" : "max-w-full lg:max-w-[68%]"}`}>
                            <h4
                              className={`line-clamp-1 text-[12px] font-black uppercase tracking-[0.12em] max-sm:text-[10px] max-sm:leading-tight max-sm:tracking-[0.015em] ${
                                isDarkCard(item)
                                  ? "text-white/70"
                                  : "text-blue-950/60"
                              }`}
                            >
                              <span className="sm:hidden">
                                {getCompetizioneTitoloMobile(item)}
                              </span>
                              <span className="hidden sm:inline">
                                {getCompetizioneTitolo(item)}
                              </span>
                            </h4>

                            <p
                              className={`mt-2 break-words text-[14px] font-black uppercase leading-tight tracking-tight max-sm:mt-1 max-sm:whitespace-nowrap max-sm:text-[clamp(10px,3vw,13px)] max-sm:leading-none max-sm:tracking-[-.035em] lg:whitespace-nowrap lg:text-[15px] lg:leading-none ${
                                isDarkCard(item)
                                  ? "text-white"
                                  : "text-blue-950"
                              }`}
                            >
                              <span className="sm:hidden">
                                {formatRisultatoMobile(item, vittoria)}
                              </span>
                              <span className="hidden sm:inline">{risultato}</span>
                            </p>
                            <span className={`hidden h-0.5 w-8 rounded-full max-sm:block ${isDarkCard(item) ? "bg-white/35" : "bg-blue-950/20"}`} aria-hidden="true" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
  );
})}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <h3 className="text-xl font-black text-blue-950">
                La storia si inizia a scrivere adesso
              </h3>

              <p className="mt-2 text-slate-500">
                Questa società non ha ancora risultati storici registrati.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
