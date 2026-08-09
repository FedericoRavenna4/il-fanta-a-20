import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getImportAdminCatalog, getImportHistory } from "@/lib/admin-import/data.server";
import AdminHeader from "../AdminHeader";
import ImportazioniClient from "./ImportazioniClient";

export const metadata: Metadata = { title: "Importazioni Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminImportazioniPage() {
  const access = await requireImportAdmin().catch(() => redirect("/admin/login"));
  const [catalog, history] = await Promise.all([getImportAdminCatalog(), getImportHistory()]);
  return <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-9">
    <AdminHeader eyebrow="Importazioni" title="Importazioni" username={access.username} href="/admin/fantabet" linkLabel="Vai a gestione FantaBet" />
    <ImportazioniClient catalog={catalog} history={history} />
  </div>;
}
