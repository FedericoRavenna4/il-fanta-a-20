"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Emblema, GruppoEmblema } from "@/lib/emblemi";
import { GRUPPI_EMBLEMI, PALETTE_EMBLEMI } from "@/lib/emblemi-ui";

type EmblemaCatalogo = Emblema & {
  detentori: { nome: string; slug: string | null }[];
};

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
  numeroNascosti,
}: {
  emblemi: EmblemaCatalogo[];
  numeroNascosti: number;
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
        className="mb-7 overflow-x-auto border-y border-slate-200/80 bg-white/55 px-1 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-md [scrollbar-width:none] sm:mb-9 sm:rounded-xl sm:border sm:px-2 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max items-center">
          {FILTRI.map((voce) => (
            <button
              key={voce}
              type="button"
              aria-pressed={filtro === voce}
              onClick={() => setFiltro(voce)}
              className={`relative min-h-9 px-3 text-[9px] font-black uppercase tracking-[0.13em] transition duration-300 sm:min-h-10 sm:px-4 sm:text-[10px] ${
                filtro === voce
                  ? "text-blue-950 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-blue-950 after:shadow-[0_0_8px_rgba(15,42,82,.55)]"
                  : "text-slate-400 hover:text-slate-700"
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

        {filtro === "Tutti" && numeroNascosti > 0 && (
          <section aria-labelledby="emblemi-nascosti">
            <div className="mb-3 flex items-center gap-3 sm:mb-4">
              <h2 id="emblemi-nascosti" className="shrink-0 text-sm font-black uppercase tracking-[0.14em] text-blue-950 sm:text-base">
                Emblemi nascosti
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-blue-950/45 to-transparent" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {Array.from({ length: numeroNascosti }, (_, index) => <EmblemaNascosto key={index} />)}
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
        <h2
          id={`categoria-${gruppo.replace(/\s+/g, "-").toLowerCase()}`}
          className="shrink-0 text-sm font-black uppercase tracking-[0.14em] text-blue-950 sm:text-base"
        >
          {gruppo}
        </h2>
        <span className={`h-px flex-1 bg-gradient-to-r ${palette.line} to-transparent`} aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:hidden">
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

function EmblemaNascosto() {
  return (
    <article
      role="img"
      aria-label="Emblema nascosto"
      className="relative flex min-h-[12.5rem] flex-col items-center justify-center overflow-hidden rounded-[1.15rem] border border-slate-300/70 bg-[radial-gradient(circle_at_50%_38%,rgba(51,65,85,.16),rgba(248,250,252,.92)_58%)] p-3 text-center shadow-[0_16px_36px_rgba(15,23,42,.08)]"
    >
      <span className="h-[4.7rem] w-[4.7rem] rounded-[42%_42%_48%_48%] bg-slate-800/80 shadow-[0_0_28px_rgba(15,23,42,.28)] [clip-path:polygon(50%_0,88%_18%,82%_72%,50%_100%,18%_72%,12%_18%)]" aria-hidden="true" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Emblema nascosto</p>
    </article>
  );
}

function EmblemaCard({ emblema }: { emblema: EmblemaCatalogo }) {
  const [source, setSource] = useState(emblema.immagine);
  const palette = PALETTE_EMBLEMI[emblema.categoria];
  const record = emblema.record?.trim();
  const valoreRecord = !record || record.toUpperCase() === "ND" ? "N/D" : record;
  const detentore = emblema.detentori.find((item) => item.slug);

  const immagine = (
    <span className="group/image relative flex h-[5.5rem] items-center justify-center sm:h-24">
      <span className={`pointer-events-none absolute h-16 w-16 rounded-full opacity-65 blur-2xl transition duration-500 group-hover:opacity-100 ${palette.glow}`} />
      <Image
        src={source}
        alt={emblema.nome}
        width={112}
        height={112}
        onError={() => setSource("/emblemi/placeholder.svg")}
        className={`relative max-h-20 max-w-20 object-contain drop-shadow-[0_12px_17px_rgba(15,23,42,.3)] transition duration-500 sm:max-h-[5.5rem] sm:max-w-[5.5rem] ${
          detentore ? "group-hover/image:-translate-y-0.5 group-hover/image:scale-[1.05]" : ""
        }`}
      />
    </span>
  );

  return (
    <article className={`group relative grid min-h-[13rem] min-w-0 grid-rows-[6rem_2.5rem_1fr] overflow-hidden rounded-[1.15rem] border bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(248,250,252,.88))] p-3 text-center ring-1 ring-inset transition duration-500 hover:-translate-y-0.5 ${palette.border} ${palette.ring} ${palette.glowStrong} sm:min-h-[13.5rem] sm:grid-rows-[6.5rem_2.5rem_1fr] sm:p-3.5`}>
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
      <p
        className="line-clamp-4 break-words text-[9px] font-semibold leading-[1.4] text-slate-500 sm:text-[10px]"
        title={`${emblema.descrizione ?? ""}${emblema.tipo === "Difendibile" ? ` RECORD: ${valoreRecord}` : ""}`}
      >
        {emblema.descrizione}
        {emblema.tipo === "Difendibile" && (
          <span className="font-black text-violet-700">{emblema.descrizione ? " " : ""}RECORD: {valoreRecord}</span>
        )}
      </p>
    </article>
  );
}
