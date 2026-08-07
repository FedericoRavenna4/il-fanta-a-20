import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountShell from "./AccountShell";
import { logoutAction } from "./actions";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export const metadata: Metadata = { title: "Il mio account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ admin?: string }> }) {
  const query = await searchParams;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/accedi");
  const { data: profile } = await supabase.from("profiles").select("username,societa_id,avatar_url").eq("id", user.id).maybeSingle();
  return <AccountShell eyebrow="Account Fanta a 20" title={profile?.username ?? "Profilo da completare"} description={profile ? "La tua identità pubblica nel portale." : "Questo utente Auth esisteva prima del sistema Account e richiede un profilo assegnato manualmente."}>{query.admin === "denied" && <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Il tuo account non è autorizzato ad accedere all’area amministrativa.</p>}<dl className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4"><div className="flex justify-between gap-4 py-4"><dt className="text-sm font-bold text-slate-500">Username</dt><dd className="font-black text-blue-950">{profile?.username ?? "Non assegnato"}</dd></div><div className="flex justify-between gap-4 py-4"><dt className="text-sm font-bold text-slate-500">Società</dt><dd className="font-black text-blue-950">{profile?.societa_id ? `#${profile.societa_id}` : "Non collegata"}</dd></div></dl><form action={logoutAction}><button className="mt-6 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-5 text-sm font-black uppercase tracking-[.12em] text-blue-950 hover:bg-slate-50">Logout</button></form></AccountShell>;
}
