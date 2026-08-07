import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { ACCOUNT_AVATAR_BUCKET, isOwnedAvatarPath } from "@/lib/account/avatar";
import type { AccountHubModules } from "@/lib/account/hub";
import { getSocieta } from "@/lib/societa";
import { logoutAction } from "./actions";
import AvatarUpload from "./AvatarUpload";
import ProfileAvatar from "./ProfileAvatar";
import ProfileModules from "./ProfileModules";
import OfficialAccountBadge from "./OfficialAccountBadge";

export const metadata: Metadata = { title: "Il mio account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function registrationDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ admin?: string }> }) {
  const query = await searchParams;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/accedi");

  const { data: profile } = await supabase.from("profiles").select("id,username,societa_id,avatar_url").eq("id", user.id).maybeSingle();
  if (!profile) return <main className="bg-[linear-gradient(180deg,#f8fbff,#eef5fb)] px-4 py-10 sm:py-16"><section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/10 sm:p-10"><p className="section-eyebrow">Area riservata</p><h1 className="mt-2 text-3xl font-black uppercase text-blue-950 sm:text-5xl">Account amministratore</h1><p className="mt-4 font-semibold text-slate-500">Profilo pubblico non configurato.</p>{query.admin === "denied" && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Questo account non è autorizzato ad accedere all’area amministrativa richiesta.</p>}<p className="mt-6 text-sm font-semibold text-slate-500">Registrato il {registrationDate(user.created_at)}</p><form action={logoutAction}><button className="mt-6 min-h-12 rounded-xl border border-slate-300 bg-white px-6 text-sm font-black uppercase tracking-[.12em] text-blue-950 hover:bg-slate-50">Logout</button></form></section></main>;

  const storedAvatarPath = isOwnedAvatarPath(profile.avatar_url, user.id) ? profile.avatar_url : null;
  const avatarUrl = storedAvatarPath ? supabase.storage.from(ACCOUNT_AVATAR_BUCKET).getPublicUrl(storedAvatarPath).data.publicUrl : null;
  const localSocieta = profile.societa_id ? getSocieta().find((item) => item.id === profile.societa_id) ?? null : null;
  const { data: registrySocieta } = profile.societa_id ? await supabase.from("societa").select("id,nome_ufficiale,categoria,girone").eq("id", profile.societa_id).maybeSingle() : { data: null };
  const societyName = registrySocieta?.nome_ufficiale ?? localSocieta?.nome ?? null;
  const category = registrySocieta?.categoria ?? localSocieta?.legaAttuale.split(" - Girone")[0] ?? null;
  const group = registrySocieta?.girone ?? localSocieta?.girone ?? null;

  // Future systems will populate only their own module. Empty modules render nothing.
  const modules: AccountHubModules = {};

  return <main className="min-h-[70vh] bg-[linear-gradient(180deg,#f8fbff,#eef5fb)] px-4 py-8 sm:py-14"><div className="mx-auto max-w-6xl">
    {query.admin === "denied" && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Il tuo account non è autorizzato ad accedere all’area amministrativa.</p>}
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-blue-950/10">
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-sky-600 px-5 py-8 text-white sm:px-9 sm:py-10">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left"><ProfileAvatar username={profile.username} avatarUrl={avatarUrl} /><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.24em] text-sky-200">Account Fanta a 20</p><h1 className="mt-2 flex min-w-0 items-center justify-center gap-2 text-3xl font-black sm:justify-start sm:text-5xl"><span className="min-w-0 break-all">{profile.username}</span><OfficialAccountBadge societaId={profile.societa_id} /></h1><p className="mt-3 text-sm font-semibold text-white/65">Registrato il {registrationDate(user.created_at)}</p>{societyName ? <p className="mt-2 font-bold text-white/90">{societyName}</p> : <p className="mt-2 font-semibold text-white/70">Nessuna società collegata</p>}</div></div>
      </div>
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <p className="section-eyebrow">Immagine profilo</p><h2 className="mt-2 text-2xl font-black text-blue-950">Il tuo avatar</h2><p className="mt-2 text-sm font-semibold text-slate-500">Se non carichi un’immagine, useremo le iniziali del tuo username.</p><AvatarUpload />
        </div>
        <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Società ufficiale</p>
          {societyName ? <div className="mt-4">{localSocieta && <Image src={localSocieta.logo} alt={societyName} width={72} height={72} className="h-16 w-16 object-contain" />}<h2 className="mt-3 text-xl font-black uppercase text-blue-950">{societyName}</h2>{category && <p className="mt-1 text-sm font-bold text-slate-600">{category}{group ? ` · Girone ${group}` : ""}</p>}{localSocieta && <Link href={`/societa/${localSocieta.slug}`} className="mt-4 inline-flex text-sm font-black text-sky-700 hover:text-blue-950">Apri la pagina pubblica →</Link>}</div> : <p className="mt-4 text-sm font-semibold text-slate-500">Nessuna società collegata</p>}
        </aside>
      </div>
    </section>
    <ProfileModules modules={modules} />
    <form action={logoutAction} className="mt-5 text-right"><button className="min-h-11 rounded-xl border border-slate-300 bg-white px-6 text-sm font-black uppercase tracking-[.12em] text-blue-950 hover:bg-slate-50">Logout</button></form>
  </div></main>;
}
