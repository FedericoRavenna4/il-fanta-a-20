import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getFantaBetAdminData } from "@/lib/fantabet/admin.server";
import AdminHeader from "../AdminHeader";
import AdminFantaBetClient from "./AdminFantaBetClient";

export const metadata: Metadata = { title: "FantaBet Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminFantaBetPage() {
  const access = await requireImportAdmin().catch(() => redirect("/account/accedi"));
  const data = await getFantaBetAdminData();
  return <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-9"><AdminHeader eyebrow="Gestione FantaBet" title="FantaBet" username={access.username} href="/admin" linkLabel="Centro Admin" /><AdminFantaBetClient initial={data} /></main>;
}
