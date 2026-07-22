import type { Metadata } from "next";
import PageHeader from "@/app/components/PageHeader";
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

      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16">
        <PageHeader
          eyebrow="Il prossimo posto può essere tuo"
          title="Lista d’attesa"
          description="Le società sono tutte occupate, ma il Fanta a 20 continua a evolversi. Raccontaci chi sei e perché vorresti diventare parte della competizione."
        />

        <section className="relative -mt-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(130deg,#06152e_0%,#0a2f5c_58%,#155284_100%)] p-4 text-white shadow-[0_28px_80px_rgba(7,31,69,.2)] sm:-mt-4 sm:rounded-[2rem] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-[75px]" />
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
          <div className="relative grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-[220px_240px_minmax(0,1fr)] lg:items-center">
            <StatusMetric eyebrow="Disponibilità" value="100 su 100" label="società occupate" tone="text-amber-300" />
            <StatusMetric
              eyebrow="Candidature"
              value={waitlistCount === null ? "—" : waitlistCount.toLocaleString("it-IT")}
              label={waitlistCount === null ? "conteggio in aggiornamento" : waitingLabel(waitlistCount)}
              tone="text-sky-300"
            />
            <blockquote className="border-t border-white/10 pt-4 text-lg font-black leading-tight tracking-[-.02em] sm:col-span-2 sm:text-2xl lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              “Non scegliamo i più forti. Scegliamo chi renderà migliore la community.”
            </blockquote>
          </div>
        </section>

        <section className="mt-6 grid gap-6 sm:mt-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-8">
          <aside className="rounded-[1.6rem] border border-white/80 bg-white/72 p-5 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur sm:p-7 lg:sticky lg:top-8">
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-600">La selezione</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-blue-950 sm:text-3xl">Un posto si conquista anche fuori dal campo.</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
              Cerchiamo persone affidabili, presenti e capaci di dare valore a un ecosistema costruito stagione dopo stagione.
            </p>
            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              <ProcessStep number="01" title="Raccontati" text="Compila ogni campo con cura e autenticità." />
              <ProcessStep number="02" title="Entra in lista" text="Riceverai immediatamente la tua posizione." />
              <ProcessStep number="03" title="Resta disponibile" text="In caso di selezione verrai contattato su Instagram." />
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] border border-white/90 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:rounded-[2rem] sm:p-8 lg:p-10">
            <div className="mb-6 border-b border-slate-200 pb-5 sm:mb-8 sm:pb-7">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-600">La tua candidatura</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl">Presentati al Fanta a 20</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Tutti i campi sono obbligatori. La candidatura verrà valutata personalmente.</p>
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
    <div className="rounded-2xl border border-white/10 bg-white/[.055] px-4 py-4 sm:px-5">
      <p className="text-[8px] font-black uppercase tracking-[.2em] text-white/42">{eyebrow}</p>
      <strong className={`mt-1 block text-3xl font-black leading-none tracking-tight tabular-nums sm:text-4xl ${tone}`}>{value}</strong>
      <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.1em] text-white/55">{label}</p>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[8px] font-black text-blue-800">{number}</span>
      <div className="min-w-0">
        <h3 className="text-xs font-black uppercase tracking-[.08em] text-blue-950">{title}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
