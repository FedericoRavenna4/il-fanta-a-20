import Link from "next/link";

const highlights = [
  {
    label: "Sezione Asta",
    title: "Asta principale",
    href: "#asta",
  },
  {
    label: "Sezione Mercati",
    title: "Aste di riparazione",
    href: "#mercati",
  },
  {
    label: "Sezione Competizioni",
    title: "Campionati e categorie",
    href: "#competizioni",
  },
  {
    label: "Sezione Calcolo",
    title: "Calcolo punteggi",
    href: "#calcolo",
  },
];

export default function RegolamentoPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-200/40 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_34%),linear-gradient(135deg,#294a8a_0%,#1a3268_45%,#10214c_100%)] px-10 py-12 text-white shadow-xl shadow-blue-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)]" />

        <div className="relative z-10 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-200">
            Documentazione ufficiale
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight">
            Il Regolamento
          </h1>

          <p className="mt-6 text-xl leading-9 text-white/80">
            Il Regolamento 3.0 raccoglie le regole ufficiali del Fanta a 20:
            aste, mercato, competizioni e calcolo dei risultati, illustrando il
            funzionamento completo della stagione.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  {highlights.map((item) => (
    <Link
      key={item.title}
      href={item.href}
      className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white px-6 py-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">
          {item.label}
        </p>

        <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-blue-950 transition-colors duration-300 group-hover:text-blue-900">
          {item.title}
        </h2>
      </div>
    </Link>
  ))}
</section>

      <section className="mt-12 space-y-10">

 {/* ASTA */}

<article id="asta" className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl lg:p-10">
  <p className="text-xs font-black uppercase tracking-[0.30em] text-amber-500">
    Sezione Asta
  </p>

  <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
    L&apos;asta principale
  </h2>

  <div className="mt-7 max-w-5xl space-y-4 text-[17px] leading-8 text-slate-600">
    <p>
      L&apos;asta principale rappresenta il momento più atteso dell&apos;intera
      stagione: è qui che ogni fantallenatore costruisce la propria rosa e pone
      le basi del campionato.
    </p>

    <p>
      La procedura si svolge con chiamata casuale per ruolo, timer di 6 secondi
      con reset automatico a ogni rilancio e utilizza esclusivamente i ruoli
      ufficiali del listone Fantacalcio.it.
    </p>

    <p>
      Ogni società dispone di <strong>498 FM</strong> per acquistare i giocatori
      di movimento, mentre i restanti <strong>2 FM</strong> sono destinati al
      pacchetto portieri, che assegna automaticamente tutti gli estremi
      difensori della stessa squadra di Serie A.
    </p>

    <p>
      La rosa viene completata durante l&apos;asta di settembre, quando ogni
      squadra raggiunge la composizione definitiva prevista dal regolamento.
    </p>
  </div>

  <div className="mt-8 rounded-[1.75rem] bg-gradient-to-br from-[#182f73] via-[#11245d] to-[#071331] p-5 text-white shadow-xl ring-1 ring-white/10">
    <div className="grid gap-4 md:grid-cols-2">
      {[
        {
          title: "Asta principale",
          subtitle: "Rosa iniziale",
          values: [
            ["3", "P"],
            ["7", "D"],
            ["7", "C"],
            ["4", "A"],
          ],
        },
        {
          title: "Dopo settembre",
          subtitle: "Rosa definitiva",
          values: [
            ["3", "P"],
            ["8", "D"],
            ["8", "C"],
            ["4/5", "A"],
          ],
        },
      ].map((block) => (
        <div
          key={block.title}
         className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300 transition-colors duration-300 group-hover:text-amber-200">
            {block.title}
          </p>

          <p className="mt-1 text-sm font-semibold text-white/60 transition-colors duration-300 group-hover:text-white/80">
            {block.subtitle}
          </p>

          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            {block.values.map(([numero, ruolo]) => (
              <div key={ruolo} className="rounded-2xl bg-white/10 px-3 py-4 transition-all duration-300 group-hover:bg-white/15">
                <p className="text-3xl font-black text-amber-300 transition-all duration-300 group-hover:scale-105 group-hover:text-amber-200">
                  {numero}
                </p>

                <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-white/65">
                  {ruolo}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</article>
{/* MERCATI */}

<article id="mercati" className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl lg:p-10">
  <p className="text-xs font-black uppercase tracking-[0.30em] text-amber-500">
    Sezione Mercati
  </p>

  <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
    Aste di riparazione
  </h2>

  <div className="mt-7 max-w-5xl space-y-4 text-[17px] leading-8 text-slate-600">
    <p>
      Le aste di riparazione permettono di intervenire sulla rosa durante la
      stagione, correggere le scelte iniziali e cogliere nuove opportunità
      offerte dal mercato.
    </p>

    <p>
      Sono previste un'asta di settembre per completare le rose, un'asta di
      gennaio e sessioni durante le pause nazionali dedicate a interventi più
      contenuti.
    </p>

    <p>
      Gli svincoli rimborsano il valore d'acquisto del giocatore e ogni
      calciatore svincolato può essere riacquistato soltanto a un prezzo pari o
      superiore a quello di svincolo.
    </p>

    <p>
      Le diverse finestre di mercato scandiscono l'intera stagione e
      permettono ai fantallenatori di adattare continuamente la propria rosa
      all'andamento del campionato.
    </p>
  </div>

  <div className="mt-8 rounded-[1.75rem] bg-gradient-to-br from-[#182f73] via-[#11245d] to-[#071331] p-5 text-white shadow-xl ring-1 ring-white/10">
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        {
          title: "Settembre",
          value: "+50 FM",
          desc: "Per completare le rose dopo l'asta principale.",
        },
        {
          title: "Gennaio",
          value: "Mercato invernale",
          desc: "L'occasione per rinforzare la squadra prima del rush finale.",
        },
        {
          title: "Pause nazionali",
          value: "2 svincoli max",
          desc: "Interventi limitati per rifinire la rosa durante tutta la stagione.",
        },
      ].map((item) => (
        <div
          key={item.title}
          className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            {item.title}
          </p>

          <h3 className="mt-3 text-2xl font-black leading-tight text-white transition-all duration-300 group-hover:text-amber-200">
  {item.value}
</h3>

          <p className="mt-4 text-sm leading-6 text-white/70">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</article>
{/* COMPETIZIONI */}

<article id="competizioni" className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl lg:p-10">
  <p className="text-xs font-black uppercase tracking-[0.30em] text-amber-500">
    Sezione Competizioni
  </p>

  <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
    Campionati e categorie
  </h2>

  <div className="mt-7 max-w-5xl space-y-4 text-[17px] leading-8 text-slate-600">
    <p>
      Il sistema campionati del Fanta a 20 è costruito su una vera piramide
      sportiva:{" "}
      <Link
        href="/campionati#serie-a"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Serie A
      </Link>
      ,{" "}
      <Link
        href="/campionati#serie-b"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Serie B
      </Link>{" "}
      e{" "}
      <Link
        href="/campionati#serie-c"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Serie C
      </Link>{" "}
      determinano il percorso competitivo di ogni società stagione dopo stagione.
    </p>

    <p>
      La Serie A e la Serie B sono composte da 20 squadre ciascuna, mentre la
      Serie C raccoglie 60 squadre suddivise in 3 gironi. Al termine della
      stagione, promozioni e retrocessioni ridisegnano l&apos;equilibrio delle
      categorie.
    </p>

    <p>
      <Link
        href="/campionati#scatto-promozione"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Lo Scatto Promozione
      </Link>{" "}
      completa il percorso della Serie C: assegna la quarta promozione in Serie
      B e rende vivo il finale di stagione anche oltre la vittoria dei singoli
      gironi.
    </p>

    <p>
      Durante il girone di ritorno ogni lega disputa anche le{" "}
      <Link
        href="/coppe#coppe-europee"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Coppe Europee
      </Link>
      , mentre tutte le 100 squadre partecipano alla{" "}
      <Link
        href="/coppe#coppa-fanta-a-20"
        className="font-bold text-blue-950 underline decoration-amber-400 decoration-2 underline-offset-4"
      >
        Coppa Fanta a 20
      </Link>
      .
    </p>
  </div>

  <div className="mt-8 rounded-[1.75rem] bg-gradient-to-br from-[#182f73] via-[#11245d] to-[#071331] p-5 text-white shadow-xl ring-1 ring-white/10">
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        {
          title: "Serie A",
          meta: "20 squadre",
          rows: [
            {
              direction: "down",
              label: "Retrocedono",
              value: "18° · 19° · 20°",
            },
          ],
        },
        {
          title: "Serie B",
          meta: "20 squadre",
          rows: [
            {
              direction: "up",
              label: "Promosse",
              value: "1° · 2° · 3°",
            },
            {
              direction: "down",
              label: "Retrocedono",
              value: "17° · 18° · 19° · 20°",
            },
          ],
        },
        {
          title: "Serie C",
          meta: "3 gironi · 60 squadre",
          rows: [
            {
              direction: "up",
              label: "Promosse",
              value: "Vincitrici dei gironi",
            },
            {
              direction: "extra",
              label: "Quarta promozione",
              value: "Scatto Promozione",
            },
          ],
        },
      ].map((categoria) => (
        <div
          key={categoria.title}
          className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300 transition-colors duration-300 group-hover:text-amber-200">
                {categoria.title}
              </p>

              <p className="mt-1 text-sm font-semibold text-white/60 transition-colors duration-300 group-hover:text-white/80">
                {categoria.meta}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {categoria.rows.map((row) => (
              <div
                key={`${categoria.title}-${row.label}`}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 group-hover:bg-white/15 ${
                  row.direction === "up"
                    ? "bg-emerald-400/15"
                    : row.direction === "down"
                      ? "bg-red-400/15"
                      : "border border-amber-300/25 bg-amber-300/10"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                    row.direction === "down"
                      ? "bg-red-400/20 text-red-100"
                      : row.direction === "up"
                        ? "bg-emerald-400/20 text-emerald-100"
                        : "bg-amber-300/20 text-amber-200"
                  }`}
                >
                  {row.direction === "down" ? "↓" : "↑"}
                </span>

                <div>
                  <p
                    className={`text-xs font-black uppercase tracking-[0.16em] ${
                      row.direction === "down"
                        ? "text-red-100"
                        : row.direction === "up"
                          ? "text-emerald-100"
                          : "text-amber-200"
                    }`}
                  >
                    {row.label}
                  </p>

                  <p className="text-lg font-black text-white">{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</article>
{/* CALCOLO */}

<article id="calcolo" className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl lg:p-10">
  <p className="text-xs font-black uppercase tracking-[0.30em] text-amber-500">
    Sezione Calcolo
  </p>

  <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-blue-950">
    Calcolo punteggi
  </h2>

  <div className="mt-7 max-w-5xl space-y-4 text-[17px] leading-8 text-slate-600">
    <p>
      Le partite del Fanta a 20 vengono calcolate utilizzando voti, bonus e
      malus ufficiali di Fantacalcio.it. Il punteggio totale determina il numero
      di reti segnate attraverso il sistema a fasce gol previsto dal regolamento.
    </p>

    <p>
      Il primo gol viene assegnato al raggiungimento dei
      <strong> 62 punti</strong>, mentre ogni
      <strong> 4 punti</strong> successivi viene realizzata una rete
      aggiuntiva. Ogni bonus, malus o mezzo punto può quindi risultare decisivo.
    </p>

    <p>
      Sono inoltre previsti il <strong>Bonus Capitano</strong>, calcolato sul
      voto puro del capitano schierato, e il
      <strong> Modificatore Difesa</strong>, basato sulla media tra portiere e
      tre migliori difensori della formazione.
    </p>

    <p>
      Le formazioni prevedono una panchina completa, fino a
      <strong> 11 sostituzioni automatiche</strong>, cambio modulo attivo e
      funzione <strong>Switch</strong>, con l'ordine della panchina che
      determina la priorità d'ingresso dei calciatori.
    </p>
  </div>

  <div className="mt-8 rounded-[1.75rem] bg-gradient-to-br from-[#182f73] via-[#11245d] to-[#071331] p-5 text-white shadow-xl ring-1 ring-white/10">
    <div className="grid gap-4 lg:grid-cols-3">

      {/* SISTEMA GOL */}

      <div className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300 transition-colors duration-300 group-hover:text-amber-200">
          Sistema gol
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-center transition-all duration-300 group-hover:bg-white/15">
            <p className="text-4xl font-black text-amber-300">62</p>

            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white/65">
              Primo gol
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-4 text-center transition-all duration-300 group-hover:bg-white/15">
            <p className="text-4xl font-black text-amber-300">+4</p>

            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white/65">
              Gol successivi
            </p>
          </div>
        </div>
      </div>

      {/* BONUS */}

      <div className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300 transition-colors duration-300 group-hover:text-amber-200">
          Bonus speciali
        </p>

        <div className="mt-5 space-y-3">

          <div className="rounded-2xl bg-white/10 px-4 py-3 transition-all duration-300 group-hover:bg-white/15">
            <p className="font-black text-white">
              Bonus Capitano
            </p>

            <p className="mt-1 text-sm text-white/65">
              Calcolato sul voto puro
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 transition-all duration-300 group-hover:bg-white/15">
            <p className="font-black text-white">
              Modificatore Difesa
            </p>

            <p className="mt-1 text-sm text-white/65">
              5 fasce bonus
            </p>
          </div>

        </div>
      </div>

      {/* FORMAZIONE */}

      <div className="group rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(251,191,36,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300 transition-colors duration-300 group-hover:text-amber-200">
          Gestione formazione
        </p>

        <div className="mt-5 space-y-3">

          {[
            "11 sostituzioni automatiche",
            "Cambio modulo attivo",
            "Funzione Switch",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-white/10 px-4 py-3 font-semibold transition-all duration-300 group-hover:bg-white/15"
            >
              {item}
            </div>
          ))}

        </div>
      </div>

    </div>
  </div>
</article>
<section className="mt-14 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-blue-950 via-[#142b69] to-slate-950 px-10 py-14 text-white shadow-xl">
  <div className="mx-auto max-w-4xl text-center">
    <h2 className="text-5xl font-black uppercase tracking-[0.02em]">
      Il Regolamento
    </h2>

    <p className="mt-6 text-lg leading-9 text-white/75">
      Le sezioni presenti in questa pagina rappresentano una panoramica delle
      principali regole del Fanta a 20. Per consultare ogni dettaglio del
      regolamento ufficiale, comprese tutte le casistiche e le norme di gioco,
      è possibile scaricare il documento completo aggiornato alla stagione in
      corso.
    </p>

    <a
      href="/regolamento.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="group mx-auto mt-10 inline-flex items-center justify-center rounded-full bg-amber-400 px-10 py-5 text-lg font-black uppercase tracking-[0.18em] text-blue-950 transition-all duration-300 hover:-translate-y-1 hover:bg-amber-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.45)]"
    >
      📄 Regolamento completo · Scarica qui
    </a>
  </div>
</section>
</section>
    </main>
  );
}