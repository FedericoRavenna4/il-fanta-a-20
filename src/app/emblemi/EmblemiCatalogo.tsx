"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Emblema, GruppoEmblema } from "@/lib/emblemi";
import { GRUPPI_EMBLEMI, PALETTE_EMBLEMI } from "@/lib/emblemi-ui";

type EmblemaCatalogo = Emblema & {
  detentori: { nome: string; slug: string | null }[];
};

type EmblemaNascostoCatalogo = Pick<Emblema, "id" | "categoria" | "immagine">;

const FILTRI: Array<GruppoEmblema | "Tutti"> = ["Tutti", ...GRUPPI_EMBLEMI];
function colonneDesktop(numero: number) {
  if (numero === 10 || numero === 5) return 5;
  if (numero === 8 || numero === 4) return 4;
  if (numero === 6) return 3;
  if (numero === 9) return 5;
  if (numero === 7) return 4;
  return Math.min(Math.max(numero, 1), 6);
}

function classiGriglia(numero: number) {
  const classi: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  return classi[numero];
}

function larghezzaRiga(elementi: number, colonne: number) {
  if (elementi === colonne) return "w-full";
  const rapporto = elementi / colonne;
  if (rapporto >= 0.8) return "w-4/5";
  if (rapporto >= 0.6) return "w-3/5";
  if (rapporto >= 0.4) return "w-2/5";
  return "w-1/5";
}

export default function EmblemiCatalogo({
  emblemi,
  nascosti,
}: {
  emblemi: EmblemaCatalogo[];
  nascosti: EmblemaNascostoCatalogo[];
}) {
  const [filtro, setFiltro] = useState<GruppoEmblema | "Tutti">("Tutti");
  const gruppiVisibili = useMemo(
    () => GRUPPI_EMBLEMI
      .filter((gruppo) => filtro === "Tutti" || filtro === gruppo)
      .map((gruppo) => ({
        nome: gruppo,
        emblemi: emblemi
          .filter(
            (emblema) =>
              emblema.categoria === gruppo
          )
          .sort((a, b) => a.id - b.id),
      }))
      .filter((gruppo) => gruppo.emblemi.length > 0),
    [emblemi, filtro]
  );

  return (
    <>
      <nav
        aria-label="Filtra gli emblemi per categoria"
        className="mb-7 w-full rounded-xl border border-slate-200/80 bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_12px_32px_rgba(15,23,42,.05)] backdrop-blur-md sm:mb-9 sm:p-2"
      >
        <div className="grid w-full grid-cols-4 gap-1 sm:grid-cols-8">
          {FILTRI.map((voce) => (
            <button
              key={voce}
              type="button"
              aria-pressed={filtro === voce}
              onClick={() => setFiltro(voce)}
              className={`relative flex min-h-9 min-w-0 items-center justify-center rounded-lg px-1 text-center text-[8px] font-black uppercase tracking-[0.07em] transition duration-300 sm:min-h-10 sm:px-2 sm:text-[9px] sm:tracking-[0.1em] lg:text-[10px] ${
                filtro === voce
                  ? "border border-blue-950/15 bg-blue-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_5px_14px_rgba(15,23,42,.13)]"
                  : "border border-transparent text-slate-400 hover:border-slate-200 hover:bg-white/80 hover:text-slate-700"
              }`}
            >
              {voce}
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-8 sm:space-y-10">
        {gruppiVisibili.filter((gruppo) => gruppo.nome !== "Da difendere").map((gruppo) => (
          <CatalogoGruppo key={gruppo.nome} gruppo={gruppo.nome} emblemi={gruppo.emblemi} />
        ))}

        {filtro === "Tutti" && nascosti.length > 0 && (
          <section aria-labelledby="emblemi-nascosti">
            <div className="mb-3 flex items-center gap-3 sm:mb-4">
              <span className="h-px flex-1 bg-gradient-to-l from-blue-950/45 to-transparent" aria-hidden="true" />
              <h2 id="emblemi-nascosti" className="shrink-0 text-sm font-black uppercase tracking-[0.14em] text-blue-950 sm:text-base">
                Emblemi nascosti
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-blue-950/45 to-transparent" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
              {nascosti.map((emblema) => <EmblemaNascosto key={emblema.id} emblema={emblema} />)}
            </div>
          </section>
        )}

        {gruppiVisibili.filter((gruppo) => gruppo.nome === "Da difendere").map((gruppo) => (
          <CatalogoGruppo key={gruppo.nome} gruppo={gruppo.nome} emblemi={gruppo.emblemi} />
        ))}
      </div>
    </>
  );
}

function CatalogoGruppo({
  gruppo,
  emblemi,
}: {
  gruppo: GruppoEmblema;
  emblemi: EmblemaCatalogo[];
}) {
  const palette = PALETTE_EMBLEMI[gruppo];
  const colonne = colonneDesktop(emblemi.length);
  const righe = Array.from(
    { length: Math.ceil(emblemi.length / colonne) },
    (_, index) => emblemi.slice(index * colonne, (index + 1) * colonne)
  );

  return (
    <section aria-labelledby={`categoria-${gruppo.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <span className={`h-px flex-1 bg-gradient-to-l ${palette.line} to-transparent`} aria-hidden="true" />
        <h2
          id={`categoria-${gruppo.replace(/\s+/g, "-").toLowerCase()}`}
          className="shrink-0 text-sm font-black uppercase tracking-[0.14em] text-blue-950 sm:text-base"
        >
          {gruppo}
        </h2>
        <span className={`h-px flex-1 bg-gradient-to-r ${palette.line} to-transparent`} aria-hidden="true" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:hidden">
        {emblemi.map((emblema) => <EmblemaCard key={emblema.id} emblema={emblema} />)}
      </div>
      <div className="hidden space-y-3 lg:block">
        {righe.map((riga, index) => (
          <div
            key={`${gruppo}-${index}`}
            className={`mx-auto grid gap-3 ${classiGriglia(riga.length)} ${larghezzaRiga(riga.length, colonne)}`}
          >
            {riga.map((emblema) => <EmblemaCard key={emblema.id} emblema={emblema} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmblemaNascosto({ emblema }: { emblema: EmblemaNascostoCatalogo }) {
  const [source, setSource] = useState(emblema.immagine);
  const palette = PALETTE_EMBLEMI[emblema.categoria];

  return (
    <article
      role="img"
      aria-label="Emblema nascosto"
      className={`relative flex min-h-[10.5rem] flex-col items-center justify-center overflow-hidden rounded-[1.15rem] border bg-[radial-gradient(circle_at_50%_38%,rgba(51,65,85,.12),rgba(248,250,252,.94)_60%)] p-2 text-center shadow-[0_16px_36px_rgba(15,23,42,.08)] sm:min-h-[12.5rem] sm:p-3 ${palette.border}`}
    >
      <span className={`pointer-events-none absolute h-20 w-20 rounded-full opacity-55 blur-2xl ${palette.glow}`} />
      <Image
        src={source}
        alt=""
        width={112}
        height={112}
        onError={() => setSource("/emblemi/placeholder.svg")}
        className="relative max-h-[4.4rem] max-w-[4.4rem] object-contain brightness-0 contrast-[2] drop-shadow-[0_12px_16px_rgba(15,23,42,.28)] sm:max-h-[5.5rem] sm:max-w-[5.5rem]"
      />
      <p className={`mt-3 text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px] ${palette.labelText}`}>{emblema.categoria}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-[10px] sm:tracking-[0.12em]">Emblema nascosto</p>
    </article>
  );
}

function EmblemaCard({ emblema }: { emblema: EmblemaCatalogo }) {
  const [source, setSource] = useState(emblema.immagine);
  const palette = PALETTE_EMBLEMI[emblema.categoria];
  const record = emblema.record?.trim();
  const valoreRecord = !record || record.toUpperCase() === "ND" ? "N/D" : record;
  const detentore = emblema.detentori.find((item) => item.slug);
  const difendibile = emblema.tipo === "Difendibile";

  const immagine = (
    <span className="group/image relative flex h-16 items-center justify-center sm:h-24">
      <span className={`pointer-events-none absolute h-16 w-16 rounded-full opacity-65 blur-2xl transition duration-500 group-hover:opacity-100 ${palette.glow}`} />
      <Image
        src={source}
        alt={emblema.nome}
        width={112}
        height={112}
        onError={() => setSource("/emblemi/placeholder.svg")}
        className={`relative max-h-14 max-w-14 object-contain drop-shadow-[0_12px_17px_rgba(15,23,42,.3)] transition duration-500 sm:max-h-[5.5rem] sm:max-w-[5.5rem] ${
          detentore ? "group-hover/image:-translate-y-0.5 group-hover/image:scale-[1.05]" : ""
        }`}
      />
    </span>
  );

  return (
    <article className={`group relative grid h-full min-h-[11rem] min-w-0 grid-rows-[4.75rem_2rem_1fr] overflow-hidden rounded-[1.15rem] border bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(248,250,252,.88))] p-2 text-center ring-1 ring-inset transition duration-500 hover:-translate-y-0.5 ${palette.border} ${palette.ring} ${palette.glowStrong} sm:min-h-[13.5rem] sm:grid-rows-[6.5rem_2.5rem_1fr] sm:p-3.5 ${difendibile ? "lg:min-h-[15rem] lg:grid-rows-[6.5rem_2.5rem_1fr_auto]" : ""}`}>
      <span className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent ${palette.line} to-transparent`} />

      {detentore?.slug ? (
        <Link
          href={`/societa/${detentore.slug}`}
          aria-label={`${emblema.nome}, apri la scheda della società proprietaria`}
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          {immagine}
        </Link>
      ) : immagine}

      <h3 className="flex items-start justify-center break-words text-[10px] font-black uppercase leading-[1.2] tracking-[0.025em] text-blue-950 sm:text-[11px]">
        {emblema.nome}
      </h3>
      <p className={`break-words text-[8px] font-semibold leading-[1.35] text-slate-500 sm:text-[10px] sm:leading-[1.4] ${difendibile ? "" : "line-clamp-4"}`} title={emblema.descrizione ?? ""}>
        {emblema.descrizione}
      </p>
      {difendibile && (
        <div className="mt-2 border-t border-violet-200/70 pt-2 text-left">
          <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[8px]">Record attuale:</p>
          <p className="mt-0.5 text-[11px] font-black text-violet-700 sm:text-sm">{valoreRecord}</p>
        </div>
      )}
    </article>
  );
}
