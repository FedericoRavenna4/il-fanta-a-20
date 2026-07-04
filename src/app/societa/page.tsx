import SocietaClient from "./SocietaClient";
import { getSocieta } from "@/lib/societa";

export default function SocietaPage() {
  const societa = getSocieta();

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="uppercase tracking-[0.3em] text-sm text-slate-500 mb-3">
          Archivio società
        </p>

        <h1 className="text-5xl font-bold text-blue-950 mb-4">
          Società
        </h1>

        <p className="text-slate-600 max-w-2xl">
          Le 100 società che compongono Il Fanta a 20, suddivise per lega e girone.
        </p>
      </div>

      <SocietaClient societa={societa} />
    </section>
  );
}