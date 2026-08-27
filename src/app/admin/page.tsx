import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "./AdminHeader";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cards = [
  { href: "/admin/importazioni", title: "Importazioni", subtitle: "Gestisci calendari e dati.", icon: "upload" },
  { href: "/admin/fantabet", title: "Gestione FantaBet", subtitle: "Gestisci turni e pronostici.", icon: "target" },
  { href: "/admin/formazioni", title: "Formazioni", subtitle: "Importa gli screenshot FantaBet.", icon: "target" },
] as const;

function AdminIcon({ type }: { type: "shield" | "upload" | "target" }) {
  if (type === "shield") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>;
  if (type === "upload") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3m10 7h-3M12 22v-3M2 12h3" /></svg>;
}

export default async function AdminHomePage() {
  const access = await requireImportAdmin().catch(() => redirect("/account/accedi"));
  const { count } = await getSupabaseAdminClient().from("profile_verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  return <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-9">
    <AdminHeader eyebrow="Area amministrativa" title="Centro Admin" username={access.username} href={`/user/${encodeURIComponent(access.username)}`} linkLabel="Torna al profilo" />
    <div data-admin-categories className="grid gap-3 md:grid-cols-3">
      <Link href="/admin/verifiche" data-admin-compact-card className="group rounded-2xl border border-sky-200 bg-gradient-to-br from-blue-950 to-blue-800 p-4 text-white shadow-[0_14px_34px_-26px_rgba(8,47,107,.9)] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-200"><AdminIcon type="shield" /></span><h2 className="min-w-0 text-base font-black uppercase leading-tight">Richieste verifica profilo</h2></div><div className="mt-3 flex items-center justify-between gap-3"><strong className="rounded-full bg-orange-300 px-2.5 py-1 text-xs font-black text-blue-950">{count ?? 0} in attesa</strong><span className="shrink-0 text-xs font-black uppercase text-sky-100">Apri →</span></div></Link>
      {cards.map((card) => <Link key={card.href} href={card.href} data-admin-compact-card className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-28px_rgba(8,47,107,.75)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><AdminIcon type={card.icon} /></span><h2 className="min-w-0 text-base font-black uppercase leading-tight text-blue-950">{card.title}</h2></div><div className="mt-3 flex items-center justify-between gap-3"><p className="min-w-0 truncate text-xs font-semibold text-slate-500">{card.subtitle}</p><span className="shrink-0 text-xs font-black uppercase text-sky-700">Apri →</span></div></Link>)}
    </div>
  </main>;
}
