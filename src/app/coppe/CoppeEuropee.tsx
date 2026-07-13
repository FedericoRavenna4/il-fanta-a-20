import Image from "next/image";

const coppe = [
  {
    nome: "Champions League",
    descrizione:
      "La coppa più prestigiosa e ambita: il palcoscenico delle squadre che hanno dominato il girone di andata.",
    qualificate: "1° - 8° posto",
    image: "/trofei/champions-league.png?v=20260713-1602",
    artwork: "lg:drop-shadow-[0_0_36px_rgba(147,197,253,0.58)]",
    light: "bg-[radial-gradient(circle_at_86%_42%,rgba(147,197,253,0.32),transparent_30%)]",
    style:
      "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 shadow-blue-950/40",
  },
  {
    nome: "Europa League",
    descrizione:
      "Una competizione di grande valore per chi vive nella fascia centrale e vuole trasformare una stagione solida in un trofeo pesante.",
    qualificate: "9° - 14° posto",
    image: "/trofei/europa-league.png?v=20260713-1602",
    artwork: "lg:drop-shadow-[0_0_34px_rgba(251,146,60,0.48)]",
    light: "bg-[radial-gradient(circle_at_86%_42%,rgba(251,191,36,0.3),transparent_30%)]",
    style:
      "border-orange-400 bg-gradient-to-br from-orange-600 via-orange-400 to-orange-100 shadow-orange-300/70",
  },
  {
    nome: "Conference League",
    descrizione:
      "La coppa delle rivincite: un’occasione concreta per risollevare una stagione difficile e chiuderla con un titolo.",
    qualificate: "15° - 20° posto",
    image: "/trofei/conference-league.png?v=20260713-1602",
    artwork: "lg:drop-shadow-[0_0_34px_rgba(52,211,153,0.46)]",
    light: "bg-[radial-gradient(circle_at_86%_42%,rgba(52,211,153,0.28),transparent_30%)]",
    style:
      "border-emerald-900/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 shadow-emerald-950/40",
  },
];

const struttura = [
  {
    step: "1",
    titolo: "Fase a gironi",
    testo: "Le prime 2 di ogni girone passano il turno.",
  },
  {
    step: "2",
    titolo: "Semifinali A/R",
    testo: "Doppio confronto con gare di andata e ritorno.",
  },
  {
    step: "3",
    titolo: "Finale secca",
    testo: "Gara unica per assegnare il trofeo.",
  },
];

export default function CoppeEuropee() {
  return (
    <section id="coppe-europee" className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-8">
      <div className="mb-6 sm:mb-10">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-amber-500">
          Coppe interne
        </p>

        <h2 className="text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl md:text-5xl">
          Le coppe europee
        </h2>

        <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-600 sm:mt-4 sm:text-lg sm:leading-8">
          Le coppe europee sono i trofei interni di ogni lega: vi partecipano le
          squadre in base al piazzamento ottenuto al termine del girone di
          andata.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-6 xl:grid-cols-3">
        {coppe.map((coppa) => (
          <article
            key={coppa.nome}
            className={`group relative overflow-hidden rounded-[2rem] border p-4 text-white shadow-xl transition duration-300 hover:-translate-y-1 sm:p-7 lg:min-h-[335px] ${coppa.style}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_42%)]" />
            <div className={`pointer-events-none absolute inset-0 ${coppa.light}`} />

<Image
  unoptimized
  src={coppa.image}
  alt={coppa.nome}
  width={230}
  height={230}
  className={`relative z-0 mx-auto mt-3 hidden h-24 w-full translate-y-0 object-contain opacity-90 drop-shadow-[0_0_26px_rgba(255,255,255,0.28)] transition duration-500 group-hover:scale-105 sm:mt-5 sm:block sm:h-36 lg:absolute lg:right-4 lg:top-[48%] lg:mx-0 lg:mt-0 lg:h-44 lg:w-40 lg:-translate-y-1/2 lg:opacity-100 lg:group-hover:scale-105 ${coppa.artwork}`}
/>

<div className="relative z-10 flex flex-col justify-between lg:min-h-[280px]">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight sm:text-[22px] lg:whitespace-nowrap">
  {coppa.nome}
</h3>

<p className="mt-2 max-w-none text-xs font-semibold leading-5 text-white/82 sm:mt-4 sm:text-[15px] sm:leading-7 lg:mt-5 lg:max-w-[55%]">
                  {coppa.descrizione}
                </p>
              </div>

             <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/20 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur sm:mt-8 sm:px-4 sm:py-3 sm:text-xs sm:tracking-[0.14em]">
                <span className="text-white/60">Qualificate</span>
                <span>{coppa.qualificate}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-9 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
        <div className="mb-6">
  <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">
    Formula
  </p>

  <h3 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-blue-950">
  STRUTTURA DELLE COPPE
</h3>
</div>

        <div className="grid gap-4 md:grid-cols-3">
          {struttura.map((fase) => (
            <div
  key={fase.step}
  className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
>
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.20),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.12),transparent_45%)] opacity-0 transition duration-300 group-hover:opacity-100" />

  <div className="relative flex items-start gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#173d8d] via-[#0d2e73] to-[#081b47] text-lg font-black text-white shadow-lg shadow-blue-950/40">
      {fase.step}
    </div>

    <div>
      

      <h4 className="mt-1 text-xl font-black text-blue-950">
        {fase.titolo}
      </h4>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        {fase.testo}
      </p>
    </div>
  </div>
</div>
          ))}
        </div>
      </div>
    </section>
  );
}
