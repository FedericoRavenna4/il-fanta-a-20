import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white">
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Image
          src="/logos/logo.png"
          alt="Logo Il Fanta a 20"
          width={170}
          height={170}
          className="mx-auto mb-8 h-auto w-auto"
        />

        <h1 className="text-5xl md:text-7xl font-bold text-blue-950 mb-6">
          IL FANTA A 20
        </h1>

        <p className="text-2xl md:text-3xl text-slate-700 font-medium mb-6">
          Il Fantacalcio Classic a 20 squadre
        </p>

        <p className="max-w-3xl mx-auto text-lg text-slate-500 mb-10">
          Un ecosistema calcistico parallelo, dove ogni partecipante guida la propria società attraverso campionati, coppe, promozioni, retrocessioni e ranking storico.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/societa"
            className="rounded-full bg-blue-950 px-8 py-3 text-white font-semibold hover:bg-blue-900"
          >
            Esplora le società
          </Link>

          <Link
            href="/ranking"
            className="rounded-full border border-blue-950 px-8 py-3 text-blue-950 font-semibold hover:bg-blue-50"
          >
            Ranking storico
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <p className="text-5xl font-bold text-blue-950">100</p>
            <p className="mt-2 text-slate-500">Società</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <p className="text-5xl font-bold text-blue-950">5</p>
            <p className="mt-2 text-slate-500">Leghe</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <p className="text-5xl font-bold text-blue-950">Dal 2023</p>
            <p className="mt-2 text-slate-500">Storia e competizione</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-blue-950 mb-10">
            Società in evidenza
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-3">
                👑 Leader Ranking
              </p>
              <h3 className="text-2xl font-bold text-blue-950">
                Kung Fu Parma
              </h3>
              <p className="mt-2 text-slate-500">#1 Ranking storico</p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-3">
                🏆 Miglior palmarès
              </p>
              <h3 className="text-2xl font-bold text-blue-950">
                Da collegare
              </h3>
              <p className="mt-2 text-slate-500">Trofei totali</p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-3">
                🏅 Ultimo vincitore Coppa Fanta a 20
              </p>
              <h3 className="text-2xl font-bold text-blue-950">
                Da collegare
              </h3>
              <p className="mt-2 text-slate-500">Stagione 2025/26</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-blue-950 mb-6">
          Una storia iniziata nel 2023
        </h2>

        <div className="max-w-4xl text-lg text-slate-600 space-y-5">
          <p>
            Nato nel 2023 da un&apos;idea tra amici, Il Fanta a 20 è cresciuto stagione dopo stagione fino a diventare un ecosistema composto da 100 società distribuite su cinque leghe.
          </p>

          <p>
            Fondato sul formato Classic a 20 squadre, senza giocatori duplicati, il progetto offre un&apos;esperienza diversa dal fantacalcio tradizionale: le rose cambiano, ma identità, palmarès e storia delle società restano.
          </p>

          <p>
            Il progetto continua a evolversi con l&apos;obiettivo di offrire una competizione sempre più curata, coinvolgente e riconoscibile.
          </p>
        </div>
      </section>
    </div>
  );
}