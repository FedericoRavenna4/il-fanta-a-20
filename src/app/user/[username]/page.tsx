import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import OfficialAccountBadge from "@/app/account/OfficialAccountBadge";
import { ACCOUNT_AVATAR_BUCKET, isOwnedAvatarPath } from "@/lib/account/avatar";
import { getSocieta } from "@/lib/societa";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

export const dynamic = "force-dynamic";

export default async function PublicUserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("id,username,societa_id,avatar_url").eq("username", username).maybeSingle();
  if (!profile) notFound();
  const avatarPath = isOwnedAvatarPath(profile.avatar_url, profile.id) ? profile.avatar_url : null;
  const avatarUrl = avatarPath ? supabase.storage.from(ACCOUNT_AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl : null;
  const society = profile.societa_id ? getSocieta().find((item) => item.id === profile.societa_id) ?? null : null;
  const initials = profile.username.slice(0, 2).toUpperCase();
  return <main className="min-h-[70vh] bg-slate-50 px-4 py-12"><section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/10 sm:p-10"><p className="text-xs font-black uppercase tracking-widest text-sky-600">Profilo Fanta a 20</p><div className="mt-5 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">{avatarUrl ? <Image src={avatarUrl} alt={`Avatar di ${profile.username}`} width={112} height={112} className="h-24 w-24 rounded-full object-cover" /> : <div aria-label={`Avatar con iniziali ${initials}`} className="grid h-24 w-24 place-items-center rounded-full bg-blue-950 text-2xl font-black text-white">{initials}</div>}<div className="min-w-0"><h1 className="flex items-center justify-center gap-2 break-all text-3xl font-black text-blue-950 sm:justify-start sm:text-5xl">{profile.username}<OfficialAccountBadge societaId={profile.societa_id} /></h1>{society ? <Link href={`/societa/${society.slug}`} className="mt-3 inline-flex font-black text-sky-700">{society.nome}</Link> : <p className="mt-3 font-semibold text-slate-500">Nessuna società collegata</p>}{user?.id === profile.id && <p><Link href="/account" className="mt-4 inline-flex text-xs font-black uppercase tracking-wider text-blue-950 hover:text-sky-700">Gestisci account</Link></p>}</div></div></section></main>;
}
