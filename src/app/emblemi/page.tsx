import type { Metadata } from "next";
import { getCatalogoEmblemi, getEmblemiSocieta } from "@/lib/emblemi";
import { getSocieta } from "@/lib/societa";
import { isEmblemaNascosto } from "@/lib/emblemi-ui";
import EmblemiCatalogo from "./EmblemiCatalogo";

export const metadata: Metadata = {
  title: "Collezione ufficiale | Il Fanta a 20",
  description: "Scopri rarità, traguardi e record da sbloccare nel mondo Fanta a 20",
};

export default function EmblemiPage() {
  const catalogo = getCatalogoEmblemi();
  const assegnazioni = getEmblemiSocieta();
  const societa = getSocieta();

  const nascosti = catalogo.filter(isEmblemaNascosto).map((emblema) => ({
    id: emblema.id,
    categoria: emblema.categoria,
    immagine: emblema.immagine,
  }));
  const emblemi = catalogo.filter((emblema) => !isEmblemaNascosto(emblema)).map((emblema) => {
    const detentori = assegnazioni
      .filter((team) =>
        team.emblemi.some(
          (posseduto) => posseduto.id === emblema.id && posseduto.stato === "Da difendere"
        )
      )
      .map((assegnazione) => {
        const team = societa.find((item) => item.id === assegnazione.squadraId);
        return {
          nome: team?.nome ?? assegnazione.nomeSocieta,
          slug: team?.slug ?? null,
        };
      });

    return {
      ...emblema,
      detentori,
    };
  });

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_48%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[50rem] -translate-x-1/2 rounded-full bg-blue-900/[0.045] blur-[100px]" />
      <div className="relative mx-auto max-w-[90rem] px-4 pb-12 pt-7 sm:px-5 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <header className="mb-6 max-w-4xl border-b border-slate-300/70 pb-5 sm:mb-8 sm:pb-6">
          <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.035em] text-blue-950 sm:text-4xl lg:text-5xl">Collezione ufficiale</h1>
          <p className="mt-3 text-[13px] font-semibold leading-5 text-slate-500 sm:text-base sm:leading-7">
            Scopri rarità, traguardi e record da sbloccare nel mondo Fanta a 20
          </p>
        </header>
        <EmblemiCatalogo emblemi={emblemi} nascosti={nascosti} />
      </div>
    </section>
  );
}
