import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getImportAdminCatalog, getImportHistory } from "@/lib/admin-import/data.server";
import { logoutAdminAction } from "../login/actions";
import ImportazioniClient from "./ImportazioniClient";

export const metadata: Metadata = { title: "Importazioni Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminImportazioniPage() {
  const access = await requireImportAdmin().catch(() => redirect("/admin/login"));
  const [catalog, history] = await Promise.all([getImportAdminCatalog(), getImportHistory()]);
  return <div className="mx-auto w-full max-w-6xl px-3 py-7 sm:px-6 sm:py-12">
    <header className="mb-7 border-b border-slate-200 pb-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-eyebrow">Area amministrativa</p><h1 className="mt-2 text-3xl font-black uppercase text-blue-950 sm:text-5xl">Importazioni</h1><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">Carica, controlla e pubblica i file esportati da Leghe Fantacalcio.</p></div><form action={logoutAdminAction} className="text-right"><p className="mb-2 text-xs font-bold text-slate-500">{access.email}</p><button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-blue-950">Esci</button></form></div></header>
    <ImportazioniClient catalog={catalog} history={history} />
  </div>;
}
