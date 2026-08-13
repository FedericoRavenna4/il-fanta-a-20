import PageHeader from "../components/PageHeader";
import CompetitionPathCards, { competitionPaths } from "../components/CompetitionPathCards";

const paths = [...competitionPaths, { eyebrow: "Le regole ufficiali", title: "Il Regolamento", text: "Il testo completo con tutte le regole ufficiali.", href: "/regolamento", image: "/images/regolamento/regolamento.png" }];

export default function RegolePage() {
  return <main className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
    <PageHeader eyebrow="Come funziona" title="Il Regolamento" onderTitle compact description="Scopri la struttura delle competizioni oppure consulta il regolamento ufficiale completo." />
    <CompetitionPathCards paths={paths} />
  </main>;
}
