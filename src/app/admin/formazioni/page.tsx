import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getLineupAdminOptions } from "@/lib/fantabet-lineups/data.server";
import AdminHeader from "../AdminHeader";
import LineupsAdminClient from "./LineupsAdminClient";

export const metadata: Metadata = { title: "Formazioni Admin", robots: { index: false, follow: false } }; export const dynamic = "force-dynamic";
export default async function AdminLineupsPage() { const access = await requireImportAdmin().catch(() => redirect("/account/accedi")); const data = await getLineupAdminOptions(); return <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-4 sm:px-6 sm:py-9"><AdminHeader eyebrow="Recognition screenshot" title="Formazioni" username={access.username} href="/admin" linkLabel="Centro Admin" /><LineupsAdminClient seasons={data.seasons} initialSeasonId={data.selectedSeasonId} /></main>; }
