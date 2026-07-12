import PageHeader from "../components/PageHeader";
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

export function ScattoPromozioneContent({ embedded = false }: { embedded?: boolean }) {
  return (
    
    <main id="scatto-promozione" className={embedded ? "scroll-mt-28" : "mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-6 lg:py-16"}>
      {!embedded && <PageHeader
        eyebrow="La corsa finale della Serie C"
        title="Lo Scatto Promozione"
        description="Quindici squadre, nove giornate e un sistema ispirato alla Formula 1 per assegnare la quarta promozione in Serie B."
      />}

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

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:mt-10 sm:p-8 lg:p-10">
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

export default function ScattoPromozionePage() {
  return <ScattoPromozioneContent />;
}
