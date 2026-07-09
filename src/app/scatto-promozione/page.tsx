import Image from "next/image";
const bonusIniziali = [
  ["1ª", "13 punti"],
  ["2ª", "8 punti"],
  ["3ª", "5 punti"],
  ["4ª", "2 punti"],
  ["5ª", "0 punti"],
];

const puntiGiornata = [
  ["1°", "25"],
  ["2°", "18"],
  ["3°", "15"],
  ["4°", "12"],
  ["5°", "10"],
  ["6°", "8"],
  ["7°", "6"],
  ["8°", "4"],
  ["9°", "2"],
  ["10°", "1"],
];

export default function ScattoPromozionePage() {
  return (
    
    <main className="mx-auto max-w-7xl px-6 py-16">
      <section className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_85%_20%,rgba(239,68,68,0.38),transparent_30%),linear-gradient(135deg,#101827_0%,#111f3f_45%,#050814_100%)] px-10 py-16 text-white shadow-2xl shadow-slate-900/25">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(45deg,rgba(255,255,255,0.18)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.18)_75%,transparent_75%,transparent)] [background-size:42px_42px]" />
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-red-500/35 blur-[120px] transition duration-500 group-hover:bg-red-500/35" />
        <div className="pointer-events-none absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
<Image
    src="/scatto-promozione/background.png"
    alt=""
    width={900}
    height={900}
    className="pointer-events-none absolute -right-45 top-[67%] h-auto w-[45rem] -translate-y-1/2 rotate-[18deg] object-contain opacity-25"
    priority
  style={{ zIndex: 0 }} /> 
  

  <div className="relative z-10 max-w-5xl"></div>
        <div className="relative z-10 max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-red-300">
            La novità
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight md:text-7xl">
            Lo Scatto Promozione
          </h1>

          <p className="mt-6 max-w-4xl text-xl font-semibold leading-9 text-white/78">
            La corsa finale della Serie C: 15 squadre, 9 giornate e un sistema
            a punti ispirato alla Formula 1 per assegnare la quarta promozione
            in Serie B.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-4">
        {[
          ["15", "partecipanti"],
          ["9", "giornate"],
          ["1", "promozione"],
          ["F1", "sistema punti"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-6 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-red-300 hover:shadow-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <p className="text-5xl font-black text-blue-950 transition duration-300 group-hover:text-red-600">
                {value}
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-red-500">
                {label}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl lg:p-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
          Formula
        </p>

        <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
          La volata per la Serie B
        </h2>

        <div className="mt-7 max-w-5xl space-y-4 text-[17px] leading-8 text-slate-600">
          <p>
  Al termine della 29ª giornata accedono allo Scatto Promozione le prime
  cinque classificate di ciascun girone di Serie C, ognuna con un bonus
  iniziale assegnato in base al piazzamento ottenuto.
</p>

          <p>
            Dalla 30ª alla 38ª giornata viene poi stilata una classifica unica
            delle 15 partecipanti in base al fantapunteggio di giornata.
          </p>

          <p>
            I punti vengono assegnati con logica Formula 1 alle prime dieci
            classificate di ogni giornata. Alla fine, la squadra con più punti
            complessivi conquista la quarta promozione in Serie B.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101827] via-[#14275a] to-[#050814] p-5 text-white shadow-xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.35),0_0_38px_rgba(239,68,68,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.20),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300 transition duration-300 group-hover:text-red-200">
                Bonus iniziale
              </p>

              <div className="mt-5 space-y-3">
                {bonusIniziali.map(([posizione, punti]) => (
                  <div
                    key={posizione}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-5 py-3 transition duration-300 group-hover:bg-white/15"
                  >
                    <span className="text-lg font-black">{posizione}</span>
                   <span className="text-lg font-black text-white">
  {punti}
</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101827] via-[#14275a] to-[#050814] p-5 text-white shadow-xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.35),0_0_38px_rgba(239,68,68,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.20),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300 transition duration-300 group-hover:text-red-200">
                Punti per giornata
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {puntiGiornata.map(([posizione, punti]) => (
                  <div
                    key={posizione}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition duration-300 group-hover:bg-white/15"
                  >
                    <span className="text-sm font-black text-white/65">
                      {posizione}
                    </span>
                    <span className="text-xl font-black text-white">
                      {punti}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}