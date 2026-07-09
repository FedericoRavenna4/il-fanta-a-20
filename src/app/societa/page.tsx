import SocietaClient from "./SocietaClient";
import { getSocieta } from "@/lib/societa";

export default function SocietaPage() {
  const societa = getSocieta();

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto mb-14 max-w-4xl text-center">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-slate-400">
          Archivio società
        </p>

        <h1 className="text-5xl font-black uppercase tracking-tight text-blue-950">
          Le Società
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          Benvenuti nella galleria delle 100 società del Fanta a 20: un mosaico di stemmi, nomi e storie che hanno contribuito a costruire l'identità della competizione nel corso degli anni.
        </p>
      </div>

      <SocietaClient societa={societa} />
    </section>
  );
}