import Image from "next/image";
import { redirect } from "next/navigation";
import AdminHeader from "../AdminHeader";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { reviewVerificationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VerificationAdminPage() {
  const access = await requireImportAdmin().catch(() => redirect("/admin/login"));
  const db = getSupabaseAdminClient();
  const { data: requests } = await db.from("profile_verification_requests").select("id,profile_id,societa_id,nome,cognome,status,created_at,note_admin").order("created_at", { ascending: false });
  const profileIds = [...new Set((requests ?? []).map((item) => item.profile_id))];
  const teamIds = [...new Set((requests ?? []).map((item) => item.societa_id))];
  const [{ data: profiles }, { data: teams }] = await Promise.all([
    profileIds.length ? db.from("profiles").select("id,username").in("id", profileIds) : Promise.resolve({ data: [] }),
    teamIds.length ? db.from("societa").select("id,nome_ufficiale,nome_personalizzato,logo_path").in("id", teamIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item.username]));
  const teamMap = new Map((teams ?? []).map((item) => [item.id, { name: item.nome_personalizzato || item.nome_ufficiale, logo: item.logo_path }]));
  return <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-9"><AdminHeader eyebrow="Controconferma manuale" title="Verifiche profilo" username={access.username} href="/admin/importazioni" linkLabel="Vai ad importazioni" /><p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-950">⚠️ Approva solo dopo aver ricevuto controconferma dal fantallenatore attraverso un contatto già noto.</p><div className="space-y-3">{(requests ?? []).map((request) => { const team = teamMap.get(request.societa_id); return <article key={request.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase text-sky-700">{profileMap.get(request.profile_id) ?? "Profilo"}</p><strong className="text-blue-950">{request.nome} {request.cognome}</strong><p className="text-xs text-slate-500">{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.created_at))}</p></div><div className="flex items-center gap-3">{team?.logo && <Image src={team.logo} alt="" width={48} height={48} className="h-12 w-12 object-contain" />}<div><strong className="text-sm text-blue-950">{team?.name ?? `Società #${request.societa_id}`}</strong><p className="text-[10px] font-black uppercase text-slate-500">{request.status}</p></div></div>{request.status === "pending" ? <form action={reviewVerificationAction} className="flex flex-wrap justify-end gap-2"><input type="hidden" name="requestId" value={request.id} /><button name="decision" value="approved" className="min-h-10 rounded-lg bg-emerald-700 px-4 text-[10px] font-black uppercase text-white">Approva</button><button name="decision" value="rejected" className="min-h-10 rounded-lg bg-rose-700 px-4 text-[10px] font-black uppercase text-white">Rifiuta</button></form> : <span className="text-right text-[10px] font-black uppercase text-slate-400">Revisionata</span>}</article>; })}{!requests?.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Nessuna richiesta.</p>}</div></main>;
}
