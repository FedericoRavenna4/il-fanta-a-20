import CoppaFanta from "./CoppaFanta";
import CoppeEuropee from "./CoppeEuropee";
import AlboDOroCoppe from "./AlboDOroCoppe";
import PageHeader from "../components/PageHeader";

export function CoppeContent({ embedded = false }: { embedded?: boolean }) {
  return (
    <section id="coppe" className={embedded ? "scroll-mt-28" : "mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16"}>
      {!embedded && <PageHeader
        eyebrow="Il palcoscenico dei trofei"
        title="Le Coppe"
        description="Dalla Coppa Fanta a 20 alle competizioni europee: percorsi diversi, grandi notti e un solo obiettivo, entrare nella storia."
      />}
      <div className="space-y-14">
        <CoppaFanta />
        <CoppeEuropee />
        <AlboDOroCoppe />
      </div>
    </section>
  );
}

export default function CoppePage() {
  return <CoppeContent />;
}
