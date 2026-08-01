"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { CategoriaEmblema, EmblemaPosseduto } from "@/lib/emblemi";
import { GRUPPI_EMBLEMI, isEmblemaNascosto, PALETTE_EMBLEMI } from "@/lib/emblemi-ui";

const ordinePrestigio = [...GRUPPI_EMBLEMI]
  .filter((gruppo): gruppo is CategoriaEmblema => gruppo !== "Da difendere")
  .reverse();

type TooltipPosition = {
  left: number;
  top: number;
  width: number;
  sopra: boolean;
};

function TestoEmblema({ emblema, tooltip = false }: { emblema: EmblemaPosseduto; tooltip?: boolean }) {
  const record = emblema.record?.trim();
  const valoreRecord = !record || record.toUpperCase() === "ND" ? "N/D" : record;

  return (
    <>
      {emblema.descrizione && (
        <span className={tooltip ? "text-white/68" : "text-slate-500"}>{emblema.descrizione}</span>
      )}
      {emblema.tipo === "Difendibile" && (
        <span className={`mt-1.5 block border-t pt-1.5 font-black tracking-[.04em] ${tooltip ? "border-violet-300/25 text-violet-300" : "border-violet-200 text-violet-700"}`}>
          RECORD: {valoreRecord}
        </span>
      )}
    </>
  );
}

function EmblemaIcona({ emblema, vetrina = false }: { emblema: EmblemaPosseduto; vetrina?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [source, setSource] = useState(emblema.immagine);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
  const palette = PALETTE_EMBLEMI[emblema.categoria];

  function mostraTooltip() {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(260, window.innerWidth - margin * 2);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, margin),
      window.innerWidth - width - margin
    );
    const sopra = rect.top > 175;
    setTooltip({ left, top: sopra ? rect.top - 9 : rect.bottom + 9, width, sopra });
  }

  useEffect(() => {
    if (!tooltip) return;
    const chiudi = () => setTooltip(null);
    window.addEventListener("scroll", chiudi, true);
    window.addEventListener("resize", chiudi);
    return () => {
      window.removeEventListener("scroll", chiudi, true);
      window.removeEventListener("resize", chiudi);
    };
  }, [tooltip]);

  const tooltipNode = tooltip && typeof document !== "undefined"
    ? createPortal(
        <div
          role="tooltip"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            width: tooltip.width,
            transform: tooltip.sopra ? "translateY(-100%)" : undefined,
          }}
          className="pointer-events-none fixed z-[160] rounded-xl border border-white/10 bg-blue-950/97 px-3.5 py-3 text-left shadow-2xl backdrop-blur-xl"
        >
          <p className={`text-[8px] font-black uppercase tracking-[0.15em] ${palette.labelText}`}>{emblema.categoria}</p>
          <p className="text-[11px] font-black uppercase leading-tight text-white">{emblema.nome}</p>
          <p className="mt-1.5 text-[10px] font-semibold leading-4">
            <TestoEmblema emblema={emblema} tooltip />
          </p>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-label={`${emblema.nome}. ${emblema.categoria}. ${emblema.descrizione ?? ""}`}
        aria-expanded={Boolean(tooltip)}
        onMouseEnter={mostraTooltip}
        onMouseLeave={() => setTooltip(null)}
        onFocus={mostraTooltip}
        onBlur={() => setTooltip(null)}
        onPointerUp={(event) => {
          if (event.pointerType !== "mouse") {
            if (tooltip) setTooltip(null);
            else mostraTooltip();
          }
        }}
        onKeyDown={(event) => event.key === "Escape" && setTooltip(null)}
        className={`group relative flex min-w-0 items-center justify-center rounded-xl outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-2 ${palette.ring} ${
          vetrina ? "h-14 p-1 sm:h-20 sm:p-2" : "h-20 p-1.5 sm:h-24 sm:p-2"
        }`}
      >
        <span className={`pointer-events-none absolute h-3/4 w-3/4 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 ${palette.glow}`} />
        <Image
          src={source}
          alt=""
          width={110}
          height={110}
          onError={() => setSource("/emblemi/placeholder.svg")}
          className={`relative object-contain drop-shadow-[0_11px_15px_rgba(15,23,42,.3)] transition duration-500 group-hover:scale-[1.05] ${
            vetrina ? "max-h-12 max-w-12 sm:max-h-[4.5rem] sm:max-w-[4.5rem]" : "max-h-[4.5rem] max-w-[4.5rem] sm:max-h-[5.25rem] sm:max-w-[5.25rem]"
          }`}
        />
      </button>
      {tooltipNode}
    </>
  );
}

export default function EmblemiSocieta({
  sbloccati,
  daDifendere,
}: {
  sbloccati: EmblemaPosseduto[];
  daDifendere: EmblemaPosseduto[];
}) {
  const [open, setOpen] = useState(false);
  const ordinatiTutti = [...sbloccati].sort(
    (a, b) =>
      ordinePrestigio.indexOf(a.categoria as CategoriaEmblema) -
        ordinePrestigio.indexOf(b.categoria as CategoriaEmblema) ||
      a.id - b.id
  );
  const ordinati = ordinatiTutti.filter((emblema) => !isEmblemaNascosto(emblema));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <section className="relative rounded-[2rem] border border-slate-200 bg-white/90 p-4 pb-12 shadow-lg shadow-slate-200/40 backdrop-blur sm:p-5 sm:pb-12">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-950">
          Collezione della società <span className="text-slate-400">— {ordinati.length}</span>
        </h2>

        <div className="mt-3 border-t border-slate-200/80 pt-3">
          <h3 className="text-base font-black uppercase tracking-tight text-blue-950">
            Emblemi sbloccati <span className="font-semibold text-slate-400">— {ordinati.length}</span>
          </h3>

          {ordinati.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {ordinati.slice(0, 6).map((emblema) => (
                <EmblemaIcona key={emblema.id} emblema={emblema} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-slate-400">Nessun emblema sbloccato.</p>
          )}

          {ordinati.length > 6 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute bottom-4 right-5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-950 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              Vedi tutti <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-violet-300/60 bg-[linear-gradient(145deg,rgba(250,248,255,.96),rgba(255,255,255,.94))] p-4 shadow-[0_16px_40px_rgba(109,40,217,.1)] sm:p-5">
        <h2 className="text-base font-black uppercase tracking-tight text-blue-950">
          Emblemi da difendere <span className="font-semibold text-slate-400">— {daDifendere.length}</span>
        </h2>
        {daDifendere.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {daDifendere.map((emblema) => (
              <EmblemaIcona key={emblema.id} emblema={emblema} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-400">Nessun emblema da difendere.</p>
        )}
      </section>

      <Link
        href="/emblemi"
        className="flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-xl border border-blue-950/15 bg-white/75 px-3 text-[9px] font-black uppercase tracking-[0.09em] text-blue-950 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-950/35 hover:bg-white hover:shadow-[0_10px_28px_rgba(15,23,42,.09)] sm:text-[10px] sm:tracking-[0.12em]"
      >
        Visualizza tutta la collezione ufficiale →
      </Link>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Collezione della società"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-md sm:p-5"
          onMouseDown={() => setOpen(false)}
        >
          <div className="relative mt-10 w-full max-w-5xl sm:mt-0" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi la collezione della società"
              className="absolute right-1 top-[-2.75rem] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/95 text-xl font-light leading-none text-blue-950 shadow-[0_10px_30px_rgba(2,8,23,.24)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:-right-12 sm:top-2"
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="max-h-[calc(100dvh-4rem)] w-full overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/15 bg-[#f4f7fa] p-4 shadow-2xl sm:max-h-[86dvh] sm:rounded-[2rem] sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-300/70 pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-black uppercase tracking-tight text-blue-950 sm:text-2xl">Collezione della società</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Emblemi sbloccati — {ordinati.length}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-x-1 gap-y-2 sm:grid-cols-7 sm:gap-3 md:grid-cols-8 lg:grid-cols-10">
              {ordinati.map((emblema) => (
                <EmblemaIcona key={emblema.id} emblema={emblema} vetrina />
              ))}
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
