import CoppaFanta from "./CoppaFanta";
import CoppeEuropee from "./CoppeEuropee";
import AlboDOroCoppe from "./AlboDOroCoppe";

export default function CoppePage() {
  return (
    <section className="mx-auto max-w-7xl space-y-14 px-6 py-16">
      <CoppaFanta />
      <CoppeEuropee />
      <AlboDOroCoppe />
    </section>
  );
}