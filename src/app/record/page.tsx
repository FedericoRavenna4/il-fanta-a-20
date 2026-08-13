import PageHeader from "../components/PageHeader";
import RecordPathCards from "../components/RecordPathCards";
import HomeEmblemShowcase from "../components/HomeEmblemShowcase";
import { getCatalogoEmblemi } from "@/lib/emblemi";
import { isEmblemaNascosto } from "@/lib/emblemi-ui";

function emblemOrder(id: number) { return id === 1 ? 0 : id === 2 ? 1 : id === 20 ? 2 : id; }

export default function RecordPage() {
  const emblems = getCatalogoEmblemi().filter((emblem) => !isEmblemaNascosto(emblem)).sort((a, b) => emblemOrder(a.id) - emblemOrder(b.id));
  return <main className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
    <PageHeader eyebrow="Storia e prestigio" title="I Record" onderTitle compact description="Ranking, trofei ed emblemi raccontano le imprese che hanno costruito la storia del Fanta a 20." />
    <RecordPathCards />
    <section className="relative left-1/2 mt-12 w-screen -translate-x-1/2 pb-3 sm:mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6"><p className="section-eyebrow">{"I simboli pi\u00f9 prestigiosi"}</p><h2 className="font-onder-title mt-2 text-3xl uppercase text-blue-950 sm:text-5xl">Gli Emblemi</h2></div>
      <HomeEmblemShowcase emblems={emblems} />
    </section>
  </main>;
}
