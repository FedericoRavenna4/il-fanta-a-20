import { getPalmares } from "@/lib/palmares";
import { getSocieta } from "@/lib/societa";

export default function HallOfFamePage() {
  const palmares = getPalmares();
  const societa = getSocieta();

  function getNome(squadraId: number) {
    return societa.find((team) => team.id === squadraId)?.nome ?? "Società";
  }

  function classificaPer(campo: keyof typeof palmares[number]) {
    return palmares
      .filter((item) => Number(item[campo]) > 0)
      .sort((a, b) => Number(b[campo]) - Number(a[campo]));
  }

  const sezioni = [
    { titolo: "Campionati", campo: "campionati" },
    { titolo: "Champions League", campo: "championsLeague" },
    { titolo: "Europa League", campo: "europaLeague" },
    { titolo: "Conference League", campo: "conferenceLeague" },
    { titolo: "Coppa Fanta a 20", campo: "coppaFantaA20" },
  ] as const;

  const reTrofei = [...palmares].sort(
    (a, b) => b.totaleTrofei - a.totaleTrofei
  )[0];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="uppercase tracking-[0.3em] text-sm text-slate-500 mb-3">
          Albo d&apos;oro
        </p>

        <h1 className="text-5xl font-bold text-blue-950 mb-4">
          Hall of Fame
        </h1>

        <p className="text-slate-600 max-w-2xl">
          Le società più vincenti nella storia del Fanta a 20.
        </p>
      </div>

      {reTrofei && (
        <div className="mb-12 rounded-3xl border border-yellow-300 bg-yellow-50 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-wider text-yellow-700 mb-2">
            Re dei trofei
          </p>

          <h2 className="text-4xl font-bold text-blue-950">
            {getNome(reTrofei.squadraId)}
          </h2>

          <p className="mt-3 text-2xl font-bold text-blue-900">
            {reTrofei.totaleTrofei} trofei
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {sezioni.map((sezione) => {
          const classifica = classificaPer(sezione.campo);

          return (
            <div
              key={sezione.titolo}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-blue-950 mb-5">
                {sezione.titolo}
              </h2>

              <div className="space-y-3">
                {classifica.map((item, index) => (
                  <div
                    key={item.squadraId}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-blue-950">
                        #{index + 1} {getNome(item.squadraId)}
                      </p>
                    </div>

                    <p className="text-xl font-bold text-blue-900">
                      {Number(item[sezione.campo])}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-950 mb-3">
          Triplete
        </h2>

        <p className="text-slate-600">
          Kung Fu Parma è l&apos;unica società ad aver conquistato nella stessa
          stagione Campionato, Champions League e Coppa Fanta a 20.
        </p>
      </div>
    </section>
  );
}