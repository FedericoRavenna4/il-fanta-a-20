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
      <div className="pointer-events-none absolute -left-52 top-12 -z-10 h-80 w-80 rounded-full bg-sky-200/30 blur-[105px]" />
      <div className="pointer-events-none absolute -right-48 top-80 -z-10 h-96 w-96 rounded-full bg-amber-100/40 blur-[115px]" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12">
        <header className="border-b border-blue-950/10 pb-4 sm:pb-6">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-600 sm:text-[10px]">Il prossimo capitolo</p>
          <div className="mt-2 grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-8">
            <h1 className="text-3xl font-black uppercase leading-none tracking-[-.035em] text-blue-950 sm:text-5xl lg:text-6xl">Lista d’attesa</h1>
            <p className="max-w-2xl text-sm font-semibold leading-5 text-slate-500 sm:text-base sm:leading-6 lg:pb-1">
              I posti sono limitati. Presenta la tua candidatura per le prossime società disponibili.
            </p>
          </div>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(130deg,#06152e_0%,#0a2f5c_62%,#155284_100%)] px-3.5 py-3 text-white shadow-[0_22px_65px_rgba(7,31,69,.18)] sm:mt-6 sm:rounded-[1.75rem] sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-[70px]" />
          <div className="relative grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
            <blockquote className="max-w-3xl text-base font-black leading-[1.2] tracking-[-.02em] sm:text-2xl lg:text-3xl">
              Non scegliamo i più forti. Scegliamo chi renderà migliore la community.
            </blockquote>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusPill label="Società occupate" value="100/100" tone="text-amber-300" />
              <StatusPill
                label={waitlistCount === 1 ? "Candidato in attesa" : "Candidati in attesa"}
                value={waitlistCount === null ? "—" : waitlistCount.toLocaleString("it-IT")}
                tone="text-sky-300"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-4 max-w-4xl rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:mt-6 sm:rounded-[2rem] sm:p-7 lg:p-8">
          <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-600">Candidatura</p>
              <h2 className="mt-1.5 text-2xl font-black uppercase tracking-tight text-blue-950 sm:text-3xl">Presentati al Fanta a 20</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400"><span className="text-amber-600">*</span> Campi obbligatori</p>
          </div>
          <WaitlistForm />
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

function StatusPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 backdrop-blur sm:min-h-12 sm:gap-2.5 sm:px-4">
      <strong className={`text-lg font-black leading-none tabular-nums sm:text-2xl ${tone}`}>{value}</strong>
      <span className="max-w-24 text-[8px] font-black uppercase leading-tight tracking-[.09em] text-white/55 sm:text-[9px]">{label}</span>
    </div>
  );
}
