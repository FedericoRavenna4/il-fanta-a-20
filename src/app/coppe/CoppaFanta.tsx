import Image from "next/image";
import TabelloneCoppaFanta from "./TabelloneCoppaFanta";
import { getTabelloneCoppaFanta } from "@/lib/tabelloneCoppaFanta";

const fasi = [
  {
    step: "01",
    title: "Girone di qualificazione",
    number: "100",
    label: "squadre",
    text: "Tutte le società partono insieme in un girone unico da 14 giornate.",
  },
  {
    step: "02",
    title: "Accesso al tabellone",
    number: "64",
    label: "qualificate",
    text: "Le migliori 64 conquistano un posto nella fase finale della competizione.",
  },
  {
    step: "03",
    title: "Fase a eliminazione",
    number: "1",
    label: "campione",
    text: "Ogni turno può diventare leggenda: una sola squadra resta in piedi fino alla coppa.",
  },
];

export default function CoppaFanta() {
  const tabellone = getTabelloneCoppaFanta();

  return (
    <section
      id="coppa-fanta-a-20"
      className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl"
    >
      <div className="group relative overflow-hidden bg-gradient-to-br from-amber-300 via-yellow-100 to-white px-4 py-5 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.32),transparent_45%)]" />

        <div className="relative z-10 grid items-center gap-4 sm:gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-amber-700">
              Coppa assoluta
            </p>

            <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl md:text-5xl lg:text-6xl">
              La Coppa Fanta a 20
            </h2>

            <p className="mt-3 max-w-5xl text-sm font-semibold leading-5 text-blue-950/75 sm:mt-6 sm:text-lg sm:leading-8 lg:text-[20px] lg:leading-9">
              Il trofeo più prestigioso del Fanta a 20. Le 100 società partono
              dallo stesso punto, senza distinzioni di lega o categoria: solo 64
              entrano nel tabellone finale, dove ogni sfida può cambiare la
              stagione e trasformare una squadra in leggenda.
            </p>
          </div>

          <div className="relative hidden h-80 items-center justify-center lg:flex">
            <div className="absolute h-72 w-72 rounded-full bg-amber-300/45 blur-3xl transition duration-500 group-hover:bg-amber-300/70" />

            <Image
              src="/trofei/coppa-fanta-a-20.png"
              alt="Coppa Fanta a 20"
              width={330}
              height={330}
              className="relative h-auto max-h-80 w-auto object-contain drop-shadow-[0_0_50px_rgba(251,191,36,0.9)] transition duration-500 group-hover:scale-110 group-hover:rotate-2 group-hover:drop-shadow-[0_0_80px_rgba(251,191,36,1)]"
            />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 lg:p-8">
        <div className="grid gap-2 sm:gap-5 lg:grid-cols-3">
          {fasi.map((fase) => (
            <article
              key={fase.step}
              className="group relative overflow-hidden rounded-[1.35rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:rounded-[1.75rem] sm:p-6"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_35%)] opacity-0 transition duration-300 group-hover:opacity-100" />

              <div className="relative flex min-h-0 flex-col sm:min-h-[270px]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-600">
                  {fase.step}
                </p>

                <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-blue-950 sm:mt-5 sm:text-2xl lg:whitespace-nowrap">
                  {fase.title}
                </h3>

                <p className="mt-1.5 min-h-0 text-[11px] font-semibold leading-4 text-slate-500 sm:mt-5 sm:min-h-[72px] sm:text-sm sm:leading-6">
                  {fase.text}
                </p>

                <div className="mt-2 rounded-xl border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-amber-100 px-3 py-1.5 text-center shadow-sm sm:mt-auto sm:rounded-[1.35rem] sm:px-5 sm:py-4">
                  <p className="text-2xl font-black leading-none text-blue-950 sm:text-5xl">
                    {fase.number}
                  </p>

                  <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                    {fase.label}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="my-6 flex items-center justify-center sm:my-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 to-amber-300" />

          <div className="mx-5 rounded-full bg-amber-300 px-6 py-2 text-sm font-black uppercase tracking-[0.18em] text-blue-950 shadow-md">
            Il tabellone finale
          </div>

          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-300 to-amber-300" />
        </div>

        <TabelloneCoppaFanta partite={tabellone} stagione="2025/26" />

        <div className="mt-10 rounded-[1.8rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">
            Archivio
          </p>

          <h3 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950">
            Archivio della competizione
          </h3>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-500">
            Lo storico della Coppa Fanta a 20 raccoglierà stagione dopo stagione
            tabelloni, finaliste e vincitori della competizione più grande del
            Fanta a 20.
          </p>
        </div>
      </div>
    </section>
  );
}
