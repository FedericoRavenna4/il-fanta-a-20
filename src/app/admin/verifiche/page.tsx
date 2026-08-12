import Image from "next/image";
import { redirect } from "next/navigation";
import AdminHeader from "../AdminHeader";
import { requireImportAdmin } from "@/lib/admin-import/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import VerificationReviewForm from "./VerificationReviewForm";
import SmoothOverflowText from "./SmoothOverflowText";

export const dynamic = "force-dynamic";

export default async function VerificationAdminPage() {
  const access = await requireImportAdmin().catch(() => redirect("/account/accedi"));
  const db = getSupabaseAdminClient();
  const { data: requests } = await db.from("profile_verification_requests").select("id,profile_id,societa_id,nome,cognome,status,created_at,note_admin").order("status", { ascending: false }).order("created_at", { ascending: false });
  const pending = (requests ?? []).filter((item) => item.status === "pending");
  const profileIds = [...new Set(pending.map((item) => item.profile_id))];
  const teamIds = [...new Set(pending.map((item) => item.societa_id))];
  const [{ data: profiles }, { data: teams }] = await Promise.all([
    profileIds.length ? db.from("profiles").select("id,username").in("id", profileIds) : Promise.resolve({ data: [] }),
    teamIds.length ? db.from("societa").select("id,nome_ufficiale,nome_personalizzato,logo_path").in("id", teamIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item.username]));
  const teamMap = new Map((teams ?? []).map((item) => [item.id, { name: item.nome_personalizzato || item.nome_ufficiale, logo: item.logo_path }]));
  return <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-9">
    <AdminHeader eyebrow="Controconferma manuale" title="Richieste verifica profili" username={access.username} href="/admin" linkLabel="Centro Admin" />
    <p className="mb-4 text-sm font-black text-blue-950">{pending.length} in attesa</p>
    <div data-verification-slim-list className="space-y-2">{pending.map((request) => { const team = teamMap.get(request.societa_id); return <article key={request.id} data-verification-compact-row className="grid min-w-0 grid-cols-[minmax(0,.9fr)_minmax(0,1.15fr)_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-4 sm:p-3">
      <div className="min-w-0"><SmoothOverflowText className="text-sm font-black text-blue-950">{profileMap.get(request.profile_id) ?? "Profilo"}</SmoothOverflowText><SmoothOverflowText className="text-xs font-semibold text-slate-500">{`(${request.nome} ${request.cognome})`}</SmoothOverflowText></div>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2"><Image src={team?.logo ?? "/logos/logo.png"} alt="" width={36} height={36} className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9" /><SmoothOverflowText className="min-w-0 flex-1 text-xs font-black uppercase text-blue-950 sm:text-sm">{team?.name ?? `Società #${request.societa_id}`}</SmoothOverflowText><time dateTime={request.created_at} className="sr-only">{request.created_at}</time></div>
      <VerificationReviewForm requestId={request.id} />
    </article>; })}{!pending.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Nessuna richiesta in attesa.</p>}</div>
  </main>;
}
