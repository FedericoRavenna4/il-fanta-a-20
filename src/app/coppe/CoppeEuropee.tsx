import Image from "next/image";

const coppe = [
  {
    nome: "Champions League",
    descrizione:
      "La coppa più prestigiosa e ambita: il palcoscenico delle squadre che hanno dominato il girone di andata.",
    qualificate: "1° - 8° posto",
    image: "/trofei/champions-league.png",
    style:
      "border-blue-900/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 shadow-blue-950/40",
  },
  {
    nome: "Europa League",
    descrizione:
      "Una competizione di grande valore per chi vive nella fascia centrale e vuole trasformare una stagione solida in un trofeo pesante.",
    qualificate: "9° - 14° posto",
    image: "/trofei/europa-league.png",
    style:
      "border-orange-400 bg-gradient-to-br from-orange-600 via-orange-400 to-orange-100 shadow-orange-300/70",
  },
  {
    nome: "Conference League",
    descrizione:
      "La coppa delle rivincite: un’occasione concreta per risollevare una stagione difficile e chiuderla con un titolo.",
    qualificate: "15° - 20° posto",
    image: "/trofei/conference-league.png",
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
    <section id="coppe-europee" className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mb-10">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-amber-500">
          Coppe interne
        </p>

        <h2 className="text-4xl font-black uppercase tracking-tight text-blue-950 md:text-5xl">
          Le coppe europee
        </h2>

        <p className="mt-4 max-w-5xl text-lg leading-8 text-slate-600">
          Le coppe europee sono i trofei interni di ogni lega: vi partecipano le
          squadre in base al piazzamento ottenuto al termine del girone di
          andata.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {coppe.map((coppa) => (
          <article
            key={coppa.nome}
            className={`group relative min-h-[335px] overflow-hidden rounded-[2rem] border p-7 text-white shadow-xl transition duration-300 hover:-translate-y-1 ${coppa.style}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_42%),radial-gradient(circle_at_88%_42%,rgba(255,255,255,0.25),transparent_28%)]" />

            <Image
  src={coppa.image}
  alt={coppa.nome}
  width={230}
  height={230}
  className={`absolute top-1/2 z-0 max-h-56 w-auto -translate-y-1/2 object-contain drop-shadow-[0_0_26px_rgba(255,255,255,0.28)] transition duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_44px_rgba(255,255,255,0.55)] ${
    coppa.nome === "Champions League" ? "-right-12" : "-right-6"
  }`}
/>

<div className="relative z-10 flex min-h-[280px] flex-col justify-between">
              <div>
                <h3 className="whitespace-nowrap text-[22px] font-black uppercase tracking-tight">
  {coppa.nome}
</h3>

<p className="mt-5 max-w-[68%] text-[15px] font-semibold leading-7 text-white/82">
                  {coppa.descrizione}
                </p>
              </div>

             <div className="mt-8 flex w-full items-center justify-between rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur">
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