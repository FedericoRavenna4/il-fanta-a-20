import type { Metadata } from "next";
import { getWaitlistCount } from "@/lib/waitlist/server";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Lista d’attesa | Il Fanta a 20",
  description: "Invia la tua candidatura ed entra nella lista d’attesa ufficiale del Fanta a 20.",
};

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const waitlistCount = await safeWaitlistCount();

  return (
    <main className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#f5f9fd_0%,#ffffff_48%,#eef5fb_100%)] text-blue-950">
      <div className="pointer-events-none absolute -left-52 top-12 -z-10 h-96 w-96 rounded-full bg-sky-200/35 blur-[110px]" />
      <div className="pointer-events-none absolute -right-48 top-[28rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-amber-100/45 blur-[120px]" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16">
        <header className="mb-5 border-b border-blue-950/10 pb-4 sm:mb-10 sm:pb-8">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-600 sm:text-[10px]">Il prossimo capitolo</p>
          <h1 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-.035em] text-blue-950 sm:text-5xl lg:text-7xl">Lista d’attesa</h1>
          <p className="mt-3 max-w-5xl text-sm font-semibold leading-5 text-slate-500 sm:mt-4 sm:text-lg sm:leading-7">
            Cento società, un ecosistema completo e nuovi posti che si aprono nel tempo. Presenta la tua candidatura per entrare nella selezione del Fanta a 20.
          </p>
        </header>

        <section className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(130deg,#06152e_0%,#0a2f5c_58%,#155284_100%)] p-4 text-white shadow-[0_28px_80px_rgba(7,31,69,.2)] sm:rounded-[2rem] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-[75px]" />
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
          <div className="relative">
            <p className="text-center text-[8px] font-black uppercase tracking-[.22em] text-amber-300 sm:text-[10px]">Il manifesto della selezione</p>
            <blockquote className="mx-auto mt-2 max-w-4xl text-center text-xl font-black leading-tight tracking-[-.025em] sm:mt-3 sm:text-3xl lg:text-4xl">
              “Non scegliamo i più forti. Scegliamo chi renderà migliore la community.”
            </blockquote>
            <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-2 sm:mt-7 sm:gap-4">
              <StatusMetric eyebrow="Disponibilità" value="100/100" label="società occupate" tone="text-amber-300" />
              <StatusMetric
                eyebrow="Candidature"
                value={waitlistCount === null ? "—" : waitlistCount.toLocaleString("it-IT")}
                label={waitlistCount === null ? "conteggio in aggiornamento" : waitingLabel(waitlistCount)}
                tone="text-sky-300"
              />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-8">
          <aside className="rounded-[1.6rem] border border-white/80 bg-white/72 p-4 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur sm:p-6 lg:sticky lg:top-8">
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-600">La selezione</p>
            <h2 className="mt-2 text-xl font-black uppercase leading-tight tracking-tight text-blue-950 sm:text-3xl">Un’opportunità per entrare nella community.</h2>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 sm:mt-4 sm:text-sm sm:leading-6">
              Cerchiamo persone affidabili, presenti e capaci di dare valore a un progetto costruito stagione dopo stagione.
            </p>
            <div className="mt-4 space-y-2.5 border-t border-slate-200 pt-4 sm:mt-6 sm:space-y-3 sm:pt-5">
              <ProcessStep number="01" title="Presentati" text="Lasciaci le informazioni essenziali e, se vuoi, raccontaci qualcosa di te." />
              <ProcessStep number="02" title="Entra nella selezione" text="La candidatura verrà aggiunta alla lista per i prossimi posti disponibili." />
              <ProcessStep number="03" title="Potresti essere il prossimo" text="Quando si libererà un posto, valuteremo i profili più adatti alla community." />
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] border border-white/90 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:rounded-[2rem] sm:p-7 lg:p-8">
            <div className="mb-5 border-b border-slate-200 pb-4 sm:mb-7 sm:pb-6">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-600">La tua candidatura</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl">Presentati al Fanta a 20</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 sm:text-sm sm:leading-6">I dati essenziali sono obbligatori. La presentazione personale è facoltativa.</p>
            </div>
            <WaitlistForm />
          </div>
        </section>
      </div>
    </main>
  );
}

async function safeWaitlistCount() {
  try {
    return await getWaitlistCount();
  } catch {
    return null;
  }
}

function waitingLabel(count: number) {
  return count === 1 ? "candidato in attesa" : "candidati in attesa";
}

function StatusMetric({ eyebrow, value, label, tone }: { eyebrow: string; value: string; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.055] px-3 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
      <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/45 sm:text-[8px] sm:tracking-[.2em]">{eyebrow}</p>
      <strong className={`mt-1 block text-2xl font-black leading-none tracking-tight tabular-nums sm:text-4xl ${tone}`}>{value}</strong>
      <p className="mt-1.5 text-[8px] font-black uppercase leading-tight tracking-[.08em] text-white/55 sm:text-[10px] sm:tracking-[.1em]">{label}</p>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[32px_minmax(0,1fr)] sm:gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[8px] font-black text-blue-800 sm:h-8 sm:w-8">{number}</span>
      <div className="min-w-0">
        <h3 className="text-[11px] font-black uppercase tracking-[.07em] text-blue-950 sm:text-xs sm:tracking-[.08em]">{title}</h3>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs sm:leading-5">{text}</p>
      </div>
    </div>
  );
}
