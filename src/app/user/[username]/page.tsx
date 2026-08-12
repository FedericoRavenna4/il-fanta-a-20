import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import OfficialAccountBadge from "@/app/account/OfficialAccountBadge";
import ProfileAvatar from "@/app/account/ProfileAvatar";
import { logoutAction } from "@/app/account/actions";
import { ACCOUNT_AVATAR_BUCKET, isOwnedAvatarPath, versionAvatarUrl } from "@/lib/account/avatar";
import { SUPPORT_BONUS_POINTS } from "@/lib/account/support";
import { resolveProfileTeamState, type VerificationStatus } from "@/lib/account/verification";
import { getSocietaTrophyCounts } from "@/lib/account/support-catalog.server";
import { getCatalogoEmblemi, getEmblemiSocieta } from "@/lib/emblemi";
import { getRanking } from "@/lib/ranking";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import type { CurrentSocieta } from "@/lib/societa/current.server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";
import { getAdminImportAccess } from "@/lib/admin-import/auth.server";
import AvatarEditorModal from "./AvatarEditorModal";
import ProfileEmblems from "./ProfileEmblems";
import { PendingVerification } from "./ProfileOnboarding";
import ProfilePathActions from "./ProfilePathActions";

export const dynamic = "force-dynamic";

type SupportSummary = { stagione_id: number; societa_id: number; selected_at: string; punti_tifo: number; punti_bonus_tifo: number; trophy_types: string[]; resolved_trophy_types: string[] };
type LeaderboardSummary = { profile_id: string; punti_totali: number; posizione: number };

const trophyRows = [
  ["campionato", "Campionato", SUPPORT_BONUS_POINTS.campionato, "/trofei/scudetto-a.png"],
  ["coppa_fanta_20", "Coppa F20", SUPPORT_BONUS_POINTS.coppaFanta20, "/trofei/coppa-fanta-a-20.png"],
  ["champions_league", "Champions", SUPPORT_BONUS_POINTS.championsLeague, "/trofei/champions-league.png"],
  ["europa_league", "Europa", SUPPORT_BONUS_POINTS.europaLeague, "/trofei/europa-league.png"],
  ["conference_league", "Conference", SUPPORT_BONUS_POINTS.conferenceLeague, "/trofei/conference-league.png"],
] as const;

function TeamIdentity({ label, team }: { label: string; team: CurrentSocieta }) {
  return <div className="mt-2"><p className="text-[10px] font-black uppercase tracking-[.16em] text-sky-200">{label}</p><Link href={`/societa/${team.slug}`} className="mt-1 inline-flex min-w-0 items-center gap-2 text-white hover:text-sky-200"><Image src={team.logo_path ?? "/logos/logo.png"} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" /><span className="truncate text-sm font-black sm:text-base">{team.nome}</span></Link></div>;
}

function StatCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-white p-4 shadow-[0_14px_35px_-24px_rgba(15,45,90,.8)] sm:p-6"><span className={`absolute inset-x-0 top-0 h-1 ${accent}`} /><h2 className="whitespace-nowrap text-[10px] font-black uppercase tracking-[.16em] text-sky-700 sm:text-xs">{title}</h2>{children}</section>;
}

export default async function PublicUserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,username,societa_id,avatar_url,updated_at").eq("username", username).maybeSingle();
  if (profileError) throw new Error(`Lettura profilo pubblico fallita: ${profileError.message}`);
  if (!profile) notFound();

  const [{ data: auth }, supportResult, leaderboardResult, seasonResult, allTeams, userEmblemsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("public_profile_support_summary", { p_profile_id: profile.id }),
    supabase.rpc("fantabet_global_leaderboard"),
    supabase.from("stagioni").select("id,codice").eq("attiva", true).maybeSingle(),
    getActiveSocietaCatalog(),
    supabase.rpc("public_profile_user_emblems", { p_profile_id: profile.id }),
  ]);
  const owner = auth.user?.id === profile.id;
  const adminAccess = owner ? await getAdminImportAccess() : null;
  const season = seasonResult.data ? { id: Number(seasonResult.data.id), code: seasonResult.data.codice } : null;
  let support = ((supportResult.data ?? [])[0] ?? null) as SupportSummary | null;
  const verificationResult = owner && profile.societa_id === null
    ? await supabase.from("profile_verification_requests").select("id,societa_id,status,created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const verification = verificationResult.data as { id: string; societa_id: number; status: VerificationStatus; created_at: string } | null;

  if (!support && owner && profile.societa_id === null && season) {
    const [directSupport, ineligibility] = await Promise.all([
      supabase.from("profile_supports").select("stagione_id,societa_id,selected_at").eq("profile_id", profile.id).eq("stagione_id", season.id).maybeSingle(),
      supabase.from("profile_support_ineligibilities").select("stagione_id").eq("profile_id", profile.id).eq("stagione_id", season.id).maybeSingle(),
    ]);
    if (directSupport.data && !ineligibility.data) support = { ...directSupport.data, punti_tifo: 0, punti_bonus_tifo: 0, trophy_types: [], resolved_trophy_types: [] };
  }

  const avatarPath = isOwnedAvatarPath(profile.avatar_url, profile.id) ? profile.avatar_url : null;
  const publicAvatarUrl = avatarPath ? supabase.storage.from(ACCOUNT_AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl : null;
  const avatarUrl = versionAvatarUrl(publicAvatarUrl, profile.updated_at);
  const officialTeam = profile.societa_id ? allTeams.find((team) => team.id === profile.societa_id) ?? null : null;
  const supportedTeam = profile.societa_id === null && support ? allTeams.find((team) => team.id === Number(support.societa_id)) ?? null : null;
  const myTeam = officialTeam ?? supportedTeam;
  const leaderboard = ((leaderboardResult.data ?? []) as LeaderboardSummary[]).find((row) => row.profile_id === profile.id) ?? null;
  const trophyCounts = getSocietaTrophyCounts();
  const rankingById = new Map(getRanking().map((item) => [item.squadraId, item.posizione]));
  const emblemTotal = getCatalogoEmblemi().length;
  const newEntryIds = new Set(allTeams.filter((team) => team.badge_tipo === "new_entry").map((team) => team.id));
  const emblemStats = new Map(getEmblemiSocieta(newEntryIds).map((team) => [team.squadraId, { unlocked: team.emblemi.filter((emblem) => emblem.stato === "Sbloccato").length, defending: team.emblemi.filter((emblem) => emblem.stato === "Da difendere").length }]));
  const selectableTeams = allTeams.flatMap((team) => { if (!team.categoria) return []; const league = team.categoria === "Serie C" && team.girone ? `Serie C Girone ${team.girone}` : team.categoria; const emblems = emblemStats.get(team.id); return [{ id: team.id, name: team.nome, logo: team.logo_path ?? "/logos/logo.png", league, category: team.categoria, group: team.girone, ranking: rankingById.get(team.id) ?? 999, trophies: trophyCounts.get(team.id) ?? 0, emblemsUnlocked: emblems?.unlocked ?? 0, emblemsTotal: emblemTotal, emblemsDefending: emblems?.defending ?? 0, story: team.storia_tifo?.trim() ?? "" }]; });
  const obtainedTrophies = new Set(support?.trophy_types ?? []);
  const resolvedTrophies = new Set(support?.resolved_trophy_types ?? []);
  const pendingVerification = verification?.status === "pending" ? verification : null;
  const pendingTeam = pendingVerification ? selectableTeams.find((team) => team.id === pendingVerification.societa_id) ?? null : null;
  const profileTeamState = resolveProfileTeamState({ societaId: profile.societa_id, verificationStatus: verification?.status ?? null, hasActiveSupport: Boolean(supportedTeam) });
  const userEmblems = (userEmblemsResult.data ?? []).map((emblem) => ({ id: emblem.id, name: emblem.nome, imageUrl: emblem.asset_path, rarity: emblem.rarita as "comune" | "raro" | "epico" | "leggendario", category: emblem.categoria, description: emblem.descrizione, status: emblem.unlocked ? "unlocked" as const : emblem.nascosto ? "secret" as const : "locked" as const, unlockedAt: emblem.unlocked_at }));

  return <main className="min-h-[70vh] overflow-x-clip bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] px-3 py-5 sm:px-6 sm:py-10"><div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
    <section data-profile-header className="relative overflow-hidden rounded-[1.6rem] border border-white/20 bg-[linear-gradient(125deg,#071a3d_0%,#0b3472_65%,#075985_100%)] p-4 text-white shadow-[0_24px_55px_-30px_rgba(3,24,64,.95)] sm:rounded-[2rem] sm:p-8"><span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-300/10 blur-2xl" /><div className="relative grid min-h-36 grid-cols-[auto_1fr] gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8"><div className="flex shrink-0 flex-col items-center"><div className="rounded-full bg-white/10 p-1 ring-1 ring-white/25"><ProfileAvatar username={profile.username} avatarUrl={avatarUrl} size="large" /></div></div><div className="min-w-0 self-start pt-2 sm:self-center sm:pt-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><h1 className="min-w-0 break-all text-2xl font-black sm:text-5xl">{profile.username}</h1><OfficialAccountBadge societaId={profile.societa_id} /></div><p className="mt-1 text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{officialTeam ? "Ufficiale" : "Community"}</p>{officialTeam ? <TeamIdentity label="Società associata" team={officialTeam} /> : supportedTeam ? <TeamIdentity label="Squadra tifata" team={supportedTeam} /> : <p className="mt-2 text-xs font-semibold text-sky-100/70">Identità Fanta a 20</p>}<div className="mt-3 hidden sm:block">{owner && <AvatarEditorModal avatarUrl={avatarUrl} username={profile.username} />}</div></div><aside data-mobile-profile-actions className="col-span-2 flex items-end justify-between border-t border-white/10 pt-3 sm:col-span-1 sm:h-full sm:min-w-44 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><div className="sm:hidden">{owner && <AvatarEditorModal avatarUrl={avatarUrl} username={profile.username} />}</div><div className="hidden text-right sm:block"><p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-200">Stagione</p><strong className="text-sm">{season?.code ?? "Attiva"}</strong></div><div className="ml-auto flex items-center gap-2">{owner && adminAccess?.allowed && <Link data-admin-center href="/admin" className="inline-flex min-h-9 items-center rounded-xl bg-orange-400 px-3 text-[9px] font-black uppercase text-blue-950 transition hover:bg-orange-300">Centro Admin</Link>}{owner && <form action={logoutAction}><button className="min-h-9 rounded-xl border border-white/25 bg-white/10 px-4 text-[10px] font-black uppercase text-white transition hover:bg-white/20">Logout</button></form>}</div></aside></div></section>

    <section data-my-team-card data-profile-team-state={profileTeamState} className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_18px_45px_-30px_rgba(8,47,107,.8)]"><div className="border-b border-sky-100 bg-gradient-to-r from-blue-950 to-blue-800 px-4 py-3 sm:px-6"><h2 className="whitespace-nowrap text-sm font-black uppercase tracking-[.16em] text-white">La mia squadra</h2></div><div className="p-4 sm:p-6">{profileTeamState === "verification-pending" && pendingVerification && pendingTeam ? <PendingVerification team={pendingTeam} createdAt={pendingVerification.created_at} /> : myTeam ? <><Link href={`/societa/${myTeam.slug}`} className="flex min-w-0 items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-sky-100 bg-sky-50/60 p-2 sm:h-24 sm:w-24"><Image src={myTeam.logo_path ?? "/logos/logo.png"} alt="" width={80} height={80} className="h-full w-full object-contain" /></div><div className="min-w-0"><strong className="block truncate text-xl text-blue-950 sm:text-3xl">{myTeam.nome}</strong><p className="mt-1 text-xs font-black uppercase tracking-wide text-sky-700">{myTeam.categoria ?? "Categoria non disponibile"}{myTeam.girone ? ` · Girone ${myTeam.girone}` : ""}</p><div className="mt-3 flex gap-4 text-xs font-bold text-slate-400"><span>Posizione —</span><span>PT —</span></div><p className="mt-1 text-[11px] font-semibold text-slate-400">Risultati recenti e percorso coppe non disponibili</p></div></Link>{!officialTeam && supportedTeam && <div data-support-bonus className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-end justify-between gap-3"><h3 className="text-xs font-black uppercase tracking-[.14em] text-blue-950">Bonus Tifo</h3><div className="flex gap-4 text-right"><div><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Punti Tifo</span><strong className="text-lg font-black text-blue-950">{Number(support?.punti_tifo ?? 0)} PT</strong></div><div><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Bonus Trofei</span><strong className="text-lg font-black text-blue-950">{Number(support?.punti_bonus_tifo ?? 0)} PT</strong></div></div></div><div className="mt-3 grid grid-cols-5 gap-1 sm:gap-2">{trophyRows.map(([key, label, points, icon]) => { const won = obtainedTrophies.has(key); const lost = !won && resolvedTrophies.has(key); const state = won ? "won" : lost ? "lost" : "pending"; return <div data-bonus-state={state} key={key} className={`min-w-0 rounded-xl border p-2 text-center ${won ? "border-emerald-200 bg-emerald-50 text-emerald-900" : lost ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-blue-950"}`}><Image src={icon} alt="" width={34} height={34} className="mx-auto h-9 w-9 object-contain sm:h-11 sm:w-11" /><span className="sr-only">{label}</span><strong className="text-xs font-black">+{points}</strong><span className="sr-only">{won ? "Trofeo vinto" : lost ? "Trofeo non vinto" : "Esito non ancora definito"}</span></div>; })}</div></div>}</> : profile.societa_id !== null ? <p className="text-sm font-semibold text-slate-500">Società ufficiale non disponibile</p> : owner && season && selectableTeams.length && (profileTeamState === "verification-rejected" || profileTeamState === "onboarding") ? <ProfilePathActions seasonId={season.id} seasonCode={season.code} teams={selectableTeams} rejected={profileTeamState === "verification-rejected"} /> : <p className="text-sm font-semibold text-slate-500">Nessuna squadra selezionata</p>}</div></section>

    <div data-profile-stats className="grid grid-cols-2 gap-2 sm:gap-4"><StatCard title="FantaBet" accent="bg-orange-400">{leaderboard ? <><strong className="mt-3 block text-2xl font-black text-blue-950 sm:text-4xl">#{leaderboard.posizione}</strong><p className="mt-1 text-[10px] font-black uppercase text-slate-500 sm:text-sm">{leaderboard.punti_totali} PT</p></> : <p className="mt-4 text-xs font-bold text-slate-500 sm:text-sm">Non classificato</p>}</StatCard><StatCard title="Arcade" accent="bg-sky-500"><p className="mt-4 text-xs font-bold text-slate-500 sm:text-sm">Non classificato</p></StatCard></div>

    <section className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_14px_35px_-26px_rgba(15,45,90,.75)] sm:p-6"><h2 className="text-sm font-black uppercase tracking-[.16em] text-blue-950">Emblemi</h2><ProfileEmblems emblems={userEmblems} /></section>
  </div></main>;
}
