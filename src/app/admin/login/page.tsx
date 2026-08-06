import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminImportAccess } from "@/lib/admin-import/auth.server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Accesso Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const access = await getAdminImportAccess();
  if (access.allowed) redirect("/admin/importazioni");
  const params = await searchParams;
  return <div className="mx-auto flex min-h-[70dvh] w-full max-w-md items-center px-3 py-10"><section className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-7"><p className="section-eyebrow">Area amministrativa</p><h1 className="mt-2 text-3xl font-black uppercase text-blue-950">Accesso admin</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Accedi con le credenziali assegnate dall’amministratore.</p><LoginForm denied={params.denied === "1"} /></section></div>;
}
