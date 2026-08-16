import type { Metadata } from "next";
import { getCatalogoEmblemi, getEmblemiSocieta } from "@/lib/emblemi";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import { isEmblemaNascosto } from "@/lib/emblemi-ui";
import EmblemiCatalogo from "./EmblemiCatalogo";
import { createPageMetadata } from "@/lib/seo";
import { getAllSocietaDefendingEmblems } from "@/lib/account/support.server";

export const metadata: Metadata = createPageMetadata({
  title: "Collezione ufficiale",
  description: "Scopri rarità, traguardi e record da sbloccare nel mondo del Fanta a 20.",
  path: "/emblemi",
});

export default async function EmblemiPage() {
  const catalogo = getCatalogoEmblemi();
  const [societa, defendingEmblems] = await Promise.all([
    getActiveSocietaCatalog(),
    getAllSocietaDefendingEmblems(),
  ]);
  const societaById = new Map(societa.map((team) => [team.id, team]));
  const newEntryIds = new Set(societa.filter((team) => team.badge_tipo === "new_entry").map((team) => team.id));
  const assegnazioni = getEmblemiSocieta(newEntryIds);
  const dynamicDefendingKeys = new Set(["titano", "abisso", "mecenate", "idolo"]);
  const dynamicByKey = new Map((defendingEmblems ?? []).map((emblema) => [emblema.chiave, emblema]));

  const nascosti = catalogo.filter(isEmblemaNascosto).map((emblema) => ({
    id: emblema.id,
    categoria: emblema.categoria,
    immagine: emblema.immagine,
  }));
  const emblemi = catalogo.filter((emblema) => !isEmblemaNascosto(emblema)).map((emblema) => {
    const dynamic = dynamicByKey.get(emblema.chiave);
    const legacyDetentori = assegnazioni
      .filter((team) =>
        team.emblemi.some(
          (posseduto) => posseduto.id === emblema.id && posseduto.stato === "Da difendere"
        )
      )
      .map((assegnazione) => {
        const team = societaById.get(assegnazione.squadraId);
        return {
          nome: team?.nome ?? assegnazione.nomeSocieta,
          slug: team?.slug ?? null,
        };
      });
    const detentori = defendingEmblems !== null && dynamicDefendingKeys.has(emblema.chiave)
      ? dynamic
        ? [{ nome: societaById.get(dynamic.societaId)?.nome ?? "Società", slug: societaById.get(dynamic.societaId)?.slug ?? null }]
        : []
      : legacyDetentori;

    return {
      ...emblema,
      record: dynamic?.record ?? emblema.record,
      detentori,
    };
  });

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_48%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[50rem] -translate-x-1/2 rounded-full bg-blue-900/[0.045] blur-[100px]" />
      <div className="relative mx-auto max-w-[90rem] px-4 pb-12 pt-7 sm:px-5 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <header className="mb-6 max-w-4xl border-b border-slate-300/70 pb-5 sm:mb-8 sm:pb-6">
          <p className="section-eyebrow">{"I simboli pi\u00f9 prestigiosi"}</p>
          <h1 className="font-onder-title font-onder-title-mobile-compact mt-2 text-blue-950">Gli Emblemi</h1>
          <p className="mt-3 text-[13px] font-semibold leading-5 text-slate-500 sm:text-base sm:leading-7">
            <span className="sm:hidden">Scopri rarità e record da sbloccare nel mondo Fanta a 20.</span>
            <span className="hidden sm:inline">Scopri rarità, traguardi e record da sbloccare nel mondo Fanta a 20</span>
          </p>
        </header>
        <EmblemiCatalogo emblemi={emblemi} nascosti={nascosti} />
      </div>
    </section>
  );
}
