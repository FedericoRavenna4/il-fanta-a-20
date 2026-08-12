import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { classifyAccountLogin, normalizeAccountUsername, validateAccountUsername } from "../src/lib/account/username.ts";
import { canSelectSupportedTeam, isSupportBonusEligible, supportBonusTotal, SUPPORT_BONUS_POINTS } from "../src/lib/account/support.ts";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "202608070001_account_profiles.sql");
const avatarMigration = read("supabase", "migrations", "202608070002_account_avatars.sql");
const leaderboardVisibilityMigration = read("supabase", "migrations", "202608080003_fantabet_leaderboard_visibility.sql");
const supportMigration = read("supabase", "migrations", "202608090002_profile_supports_fantabet_bonus.sql");
const supportPointsMigration = read("supabase", "migrations", "202608090003_fantabet_support_match_points.sql");
const visibilityAndStoryMigration = read("supabase", "migrations", "202608100002_fantabet_visibility_societa_tifo.sql");
const baseVisibilityMigration = read("supabase", "migrations", "202608100003_fantabet_base_leaderboard_visibility.sql");
const competitionsMigration = read("supabase", "migrations", "202608040002_competizioni.sql");
const testSupportReset = read("supabase", "manual", "test_only_reset_testesterno_support.sql");

test("normalizza username e rende case-insensitive l'unicità", () => {
  assert.equal(normalizeAccountUsername("  Federico_20 "), "federico_20");
  assert.equal(normalizeAccountUsername("Federico"), normalizeAccountUsername("FEDERICO"));
  assert.match(migration, /username_normalizzato text not null unique/i);
});

test("rifiuta username non validi e riservati", () => {
  for (const value of ["1utente", "ab", "nome-utente", "èutente", "utente spazio"]) assert.equal(validateAccountUsername(value).ok, false);
  for (const value of ["ADMIN", " staff ", "IlFantaA20"]) assert.equal(validateAccountUsername(value).ok, false);
  assert.equal(validateAccountUsername("Utente_20").ok, true);
});

test("login distingue email e username con normalizzazione condivisa", () => {
  assert.deepEqual(classifyAccountLogin("utente@example.com"), { type: "email", value: "utente@example.com" });
  assert.deepEqual(classifyAccountLogin(" TestFanta20 "), { type: "username", value: "testfanta20" });
  assert.deepEqual(classifyAccountLogin("UTENTE_20"), { type: "username", value: "utente_20" });
});

test("login username risolve email soltanto server-side e usa errore neutro", () => {
  const actions = read("src", "app", "account", "actions.ts");
  const page = read("src", "app", "account", "accedi", "page.tsx");
  const resolver = read("src", "lib", "account", "login.server.ts");
  const client = read("src", "app", "account", "AuthForm.tsx");
  assert.match(page, /Email o username/); assert.match(page, /name: "identifier"/);
  assert.match(actions, /resolveAccountLoginEmail\(identifier\)/); assert.match(actions, /signInWithPassword\(\{ email, password \}\)/);
  assert.equal((actions.match(/Credenziali non valide\./g) ?? []).length, 3);
  assert.match(resolver, /import "server-only"/); assert.match(resolver, /username_normalizzato/); assert.match(resolver, /auth\.admin\.getUserById/);
  assert.doesNotMatch(page + client, /SUPABASE_SERVICE_ROLE_KEY|service_role|username_normalizzato|auth\.admin|user\.email/);
});

test("login porta al profilo pubblico e mantiene account solo come fallback legacy", () => {
  const actions = read("src", "app", "account", "actions.ts");
  const callback = read("src", "app", "account", "callback", "route.ts");
  const login = actions.slice(actions.indexOf("export async function loginAction"), actions.indexOf("export async function logoutAction"));
  assert.match(login, /select\("username"\)\.eq\("id", login\.user\.id\)\.maybeSingle\(\)/);
  assert.match(login, /redirect\(profile\?\.username \? `\/user\/\$\{encodeURIComponent\(profile\.username\)\}` : "\/account"\)/);
  assert.doesNotMatch(login, /redirect\("\/account"\)/);
  assert.match(callback, /destination === "\/account"[\s\S]*session\.user[\s\S]*`\/user\/\$\{encodeURIComponent\(profile\.username\)\}`/);
});

test("crea il profilo automaticamente e lo valida nel database", () => {
  assert.match(migration, /after insert on auth\.users/i);
  assert.match(migration, /insert into public\.profiles/i);
  assert.match(migration, /new\.raw_user_meta_data ->> 'username'/i);
  assert.match(migration, /profiles_validate_before_insert/i);
});

test("profiles è pubblico in lettura ma immutabile per authenticated", () => {
  assert.match(migration, /grant select \(id, username, societa_id, avatar_url\).*to anon, authenticated/is);
  assert.doesNotMatch(migration, /grant[^;]*update[^;]*profiles[^;]*authenticated/is);
  assert.doesNotMatch(migration, /create policy[^;]*profiles[^;]*for update/is);
});

test("un utente normale non viene disconnesso visitando admin", () => {
  const proxy = read("src", "lib", "supabase", "proxy.ts");
  const deniedBranch = proxy.slice(proxy.indexOf('if (pathname.startsWith("/admin") && user && !authorized)'), proxy.indexOf('if (pathname.startsWith("/admin") && !user'));
  assert.doesNotMatch(deniedBranch, /signOut/);
  assert.match(deniedBranch, /\/account/);
});

test("service role non entra nei componenti account client", () => {
  const client = read("src", "app", "account", "AuthForm.tsx");
  assert.doesNotMatch(client, /SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

test("avatar ha fallback deterministico", async () => {
  const { accountInitials } = await import("../src/lib/account/avatar.ts");
  assert.equal(accountInitials("federico_20"), "F2");
  assert.equal(accountInitials("utente"), "UT");
  assert.match(read("src", "app", "account", "ProfileAvatar.tsx"), /data-avatar-fallback/);
});

test("upload avatar è limitato al path del proprietario", () => {
  assert.match(avatarMigration, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/i);
  assert.match(avatarMigration, /owner_id = \(select auth\.uid\(\)::text\)/i);
  assert.match(avatarMigration, /account_avatars_insert_own/);
  assert.match(avatarMigration, /account_avatars_update_own/);
  assert.doesNotMatch(avatarMigration, /for (?:insert|update)[\s\S]*?with check \(\s*true\s*\)/i);
});

test("rifiuta path avatar altrui e path traversal", async () => {
  const { isOwnedAvatarPath } = await import("../src/lib/account/avatar.ts");
  const own = "11111111-1111-1111-1111-111111111111";
  assert.equal(isOwnedAvatarPath(`${own}/avatar.png`, own), true);
  assert.equal(isOwnedAvatarPath(`other/avatar.png`, own), false);
  assert.equal(isOwnedAvatarPath(`${own}/../avatar.png`, own), false);
});

test("profilo gestisce società assente e presente", () => {
  const page = read("src", "app", "account", "page.tsx");
  assert.match(page, /Nessuna società collegata/);
  assert.match(page, /getActiveSocietaById\(profile\.societa_id\)/);
  assert.match(page, /officialSocieta\.logo_path/);
  assert.match(page, /\/societa\/\$\{officialSocieta\.slug\}/);
  assert.doesNotMatch(page, /getSocieta|localSocieta|nome_ufficiale,categoria,girone/);
});

test("account legacy completa un normale profilo senza username inventati", () => {
  const page = read("src", "app", "account", "page.tsx");
  assert.match(page, /<CompleteProfileForm/);
  assert.match(page, /Completa il profilo/);
  assert.doesNotMatch(page, /Account amministratore|Profilo pubblico non configurato|Profilo da completare/i);
});

test("moduli futuri restano nascosti senza dati", async () => {
  const { visibleAccountModuleKeys } = await import("../src/lib/account/hub.ts");
  assert.deepEqual(visibleAccountModuleKeys({}), []);
  assert.match(read("src", "app", "account", "ProfileModules.tsx"), /if \(!keys\.length\) return null/);
});

test("avatar non concede modifiche client a username o società", () => {
  assert.doesNotMatch(avatarMigration, /grant[^;]*update[^;]*profiles[^;]*authenticated/is);
  assert.match(avatarMigration, /set avatar_url = p_avatar_path/);
  assert.doesNotMatch(avatarMigration, /set[^;]*(?:username|societa_id)/i);
});

test("limiti avatar coordinati senza aumentare il limite reale", () => {
  const avatar = read("src", "lib", "account", "avatar.ts");
  const upload = read("src", "app", "account", "AvatarUpload.tsx");
  const config = read("next.config.ts");
  assert.match(avatar, /ACCOUNT_AVATAR_MAX_BYTES = 750 \* 1024/);
  assert.match(avatarMigration, /file_size_limit, allowed_mime_types[\s\S]*?768000/i);
  assert.match(config, /bodySizeLimit: "1\.2mb"/);
  assert.match(upload, /file\.size > ACCOUNT_AVATAR_MAX_BYTES/);
  assert.match(upload, /event\.preventDefault\(\)/);
  assert.match(upload, /L’immagine non può superare 750 KB\./);
});

test("badge ufficiale dipende esclusivamente da societa_id", async () => {
  const { isOfficialAccount } = await import("../src/lib/account/hub.ts");
  const badge = read("src", "app", "account", "OfficialAccountBadge.tsx");
  const page = read("src", "app", "account", "page.tsx");
  assert.equal(isOfficialAccount(null), false);
  assert.equal(isOfficialAccount(12), true);
  assert.match(badge, /if \(!isOfficialAccount\(societaId\)\) return null/);
  assert.match(badge, /Partecipante ufficiale Fanta a 20/);
  assert.match(page, /<OfficialAccountBadge societaId=\{profile\.societa_id\}/);
  assert.doesNotMatch([badge, page].join("\n"), /\bverified\b/i);
});

test("il badge non introduce modifiche client a societa_id", () => {
  const badge = read("src", "app", "account", "OfficialAccountBadge.tsx");
  assert.doesNotMatch(badge, /"use client"|\.update\(|server action/i);
  assert.doesNotMatch(avatarMigration, /set[^;]*societa_id/i);
});

test("fallimento RPC pulisce soltanto il nuovo oggetto avatar", () => {
  const actions = read("src", "app", "account", "actions.ts");
  assert.match(actions, /persistence\.step === "profile-update" && profile\.avatar_url !== path[\s\S]*?remove\(\[path\]\)/);
  assert.match(actions, /profile\.avatar_url !== path/);
});

test("username e badge non causano overflow mobile", () => {
  const page = read("src", "app", "account", "page.tsx");
  assert.match(page, /<h1 className="[^"]*min-w-0[^"]*"/);
  assert.match(page, /<span className="min-w-0 break-all">\{profile\.username\}<\/span>/);
});

test("header espone solo Home Campionati Società e FantaBet", () => {
  const header = read("src", "app", "components", "Header.tsx");
  assert.match(header, /href: "\/".*title: "Home"/s);
  assert.match(header, /href: "\/campionati-live-preview".*title: "Campionati"/s);
  assert.match(header, /href: "\/societa".*title: "Società"/s);
  assert.match(header, /href: "\/fantabet".*title: "FantaBet"/s);
  assert.doesNotMatch(header, /href: "\/(?:emblemi|statistiche|gioca)"|title: "(?:Emblemi|Statistiche|Gioca|Arcade)"/);
});

test("header autenticato usa avatar reale o fallback senza username testuale", () => {
  const header = read("src", "app", "components", "Header.tsx");
  const server = read("src", "lib", "account", "server.ts");
  assert.match(header, /<ProfileAvatar username=\{username \?\? "Account"\} avatarUrl=\{account\.avatarUrl\} size="header"/);
  assert.match(header, /aria-label="Apri il tuo profilo"/);
  assert.match(header, /`\/user\/\$\{encodeURIComponent\(username\)\}` : "\/account"/);
  assert.doesNotMatch(header, />\{account\.username\}</);
  assert.match(server, /isOwnedAvatarPath/); assert.match(server, /getPublicUrl\(avatarPath\)/);
  assert.match(server, /username: null, avatarUrl: null/);
});

test("mobile mantiene avatar accanto hamburger e fuori dal drawer", () => {
  const header = read("src", "app", "components", "Header.tsx");
  const controls = header.slice(header.indexOf('<div className="flex shrink-0 items-center gap-2">'), header.indexOf('</header>'));
  const drawer = header.slice(header.indexOf('aria-label="Navigazione mobile"'));
  assert.match(controls, /<ProfileButton[\s\S]*aria-label=\{mobileOpen \? "Chiudi menu" : "Apri menu"\}/);
  assert.doesNotMatch(drawer, /<ProfileButton|ProfileAvatar/);
  assert.match(drawer, /mainLinks\.map/); assert.match(drawer, /min-w-0/);
});

test("profilo pubblico risolve lo username reale senza leggere colonne non pubbliche", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /\.eq\("username", username\)\.maybeSingle\(\)/);
  assert.doesNotMatch(page, /username_normalizzato|normalizeAccountUsername/);
  assert.match(page, /if \(!profile\) notFound\(\)/);
});

test("menu mobile separa le azioni account e usa il logout server-side esistente", () => {
  const header = read("src", "app", "components", "Header.tsx");
  const drawer = header.slice(header.indexOf('aria-label="Navigazione mobile"'));
  assert.match(header, /import \{ logoutAction \} from "@\/app\/account\/actions"/);
  assert.match(drawer, /data-mobile-account-menu[\s\S]*mt-auto[\s\S]*border-t/);
  assert.match(drawer, /account \? <form action=\{logoutAction\}>[\s\S]*Logout/);
  assert.match(drawer, /: <div className="grid grid-cols-2 gap-3">[\s\S]*Accedi[\s\S]*Registrati/);
});

test("anonimo vede Accedi e Registrati senza avatar fake", () => {
  const header = read("src", "app", "components", "Header.tsx");
  assert.match(header, /account \? <ProfileButton[\s\S]*Accedi[\s\S]*Registrati/);
  assert.match(header, /account \? <form action=\{logoutAction\}>[\s\S]*: <div[\s\S]*Accedi[\s\S]*Registrati/);
});

test("profilo definitivo apre l'editor avatar e limita Modifica e Logout all'owner", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const editor = read("src", "app", "user", "[username]", "AvatarEditorModal.tsx");
  assert.match(page, /const owner = auth\.user\?\.id === profile\.id/);
  assert.match(page, /\{owner && <AvatarEditorModal avatarUrl=\{avatarUrl\} username=\{profile\.username\} \/>\}/);
  assert.match(page, /\{owner && <form action=\{logoutAction\}[\s\S]*Logout/);
  assert.match(editor, /Immagine del profilo/); assert.match(editor, />Ritaglia</); assert.match(editor, />Cambia immagine</);
  assert.doesNotMatch(page, /Gestisci account|Profilo Fanta a 20|Account Fanta a 20|Registrato il|Nessuna società collegata/i);
});

test("profilo mostra società associata o squadra tifata con link reale", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(page, /officialTeam \? <TeamIdentity label="Società associata"/);
  assert.match(page, /: supportedTeam \? <TeamIdentity label="Squadra tifata"/);
  assert.match(page, /href=\{`\/societa\/\$\{team\.slug\}`\}/);
  assert.match(selector, /Scegli la tua squadra/);
});

test("solo owner esterno senza supporto vede selezione e conferma stagionale", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(page, /profileTeamState === "verification-pending"[\s\S]*ProfilePathActions/);
  assert.match(page, /from\("profile_supports"\)[\s\S]*eq\("profile_id", profile\.id\)/);
  assert.match(selector, /selectSupportedTeamAction/);
  assert.match(selector, /essere modificata/);
  assert.match(selector, />CONFERMA!</); assert.match(selector, />TORNA ALLA SELEZIONE</);
  assert.match(selector, /name="confirmed" value="true"/);
  assert.match(selector, /Filtra per lega/); assert.match(selector, /Serie C Girone A/);
  assert.match(selector, /team\.ranking/); assert.match(selector, /team\.trophies/);
  assert.match(supportMigration, /support_already_selected/);
});

test("profilo espone squadra a tutta larghezza, due statistiche e fallback neutri", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.ok(page.indexOf("data-my-team-card") < page.indexOf("data-profile-stats"));
  assert.match(page, /data-profile-stats className="grid grid-cols-2/);
  assert.match(page, /title="FantaBet"/); assert.match(page, /title="Arcade"/); assert.match(page, />La mia squadra</);
  assert.ok((page.match(/Non classificato/g) ?? []).length >= 2);
  assert.match(page, /<span>Posizione —<\/span><span>PT —<\/span>/); assert.match(page, /percorso coppe non disponibili/);
});

test("Bonus Tifo usa ledger reale e resta nascosto agli ufficiali", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /!officialTeam && supportedTeam/);
  assert.match(page, /support\?\.punti_bonus_tifo/);
  assert.match(page, /Trofeo vinto/); assert.match(page, /Esito non ancora definito/);
  assert.match(page, /Campionato/); assert.match(page, /Coppa F20/); assert.match(page, /Champions/); assert.match(page, /Europa/); assert.match(page, /Conference/);
});

test("Bonus Tifo usa cinque icone reali, tre stati visuali e totale compatto", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.equal((page.match(/"\/trofei\//g) ?? []).length, 5);
  assert.match(page, /data-support-bonus/); assert.match(page, /Punti Tifo/); assert.match(page, /Bonus Trofei/);
  assert.match(page, /data-bonus-state=\{state\}/);
  assert.match(page, /"won" : lost \? "lost" : "pending"/);
  assert.match(page, /border-emerald-200/); assert.match(page, /border-rose-200/); assert.match(page, /border-slate-200/);
  assert.match(supportMigration, /resolved_trophy_types text\[\]/);
});

test("header profilo premium usa lo spazio desktop e tiene logout in basso a destra mobile", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /data-profile-header/);
  assert.match(page, /sm:grid-cols-\[auto_1fr_auto\]/);
  assert.match(page, /col-span-2 flex items-end justify-between[\s\S]*sm:flex-col sm:items-end/);
  assert.match(page, /\{owner && <form action=\{logoutAction\}>/);
  assert.match(page, /overflow-x-clip/);
});

test("profilo prepara Emblemi senza ownership fittizia", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const emblems = read("src", "app", "user", "[username]", "ProfileEmblems.tsx");
  assert.match(page, />Emblemi</); assert.match(page, /<ProfileEmblems emblems=\{userEmblems\}/);
  assert.match(emblems, /data-owned-emblem-showcase/); assert.match(emblems, /Emblemi sbloccati:/);
  assert.match(emblems, /"unlocked" \| "locked" \| "secret"/); assert.match(emblems, /Nessun emblema disponibile/);
  assert.doesNotMatch(page, /demo-emblem|mock-emblem|emblema sbloccato/i);
});

test("layout profilo mobile è compatto e non crea overflow orizzontale", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /overflow-x-clip/);
  assert.match(page, /grid grid-cols-2 gap-2 sm:gap-4/);
  assert.match(page, /grid-cols-\[auto_1fr\][\s\S]*sm:grid-cols-\[auto_1fr_auto\]/);
  assert.match(page, /whitespace-nowrap/);
  assert.match(page, /min-w-0/);
});

test("editor avatar usa un nuovo originale, consente zoom bidirezionale e riusa l'upload sicuro", () => {
  const editor = read("src", "app", "user", "[username]", "AvatarEditorModal.tsx");
  assert.match(editor, /uploadAvatarAction/); assert.match(editor, /router\.refresh\(\)/);
  assert.match(editor, /ACCOUNT_AVATAR_MAX_BYTES/); assert.match(editor, /ACCOUNT_AVATAR_MIME_TYPES/);
  assert.match(editor, /canvas\.width = 512/); assert.match(editor, /canvas\.height = 512/);
  assert.match(editor, /type="range"[\s\S]*min="1"[\s\S]*max="3"/);
  assert.match(editor, /onPointerMove/); assert.match(editor, /rounded-full/);
  assert.match(editor, /if \(!source\) throw new Error\("Scegli prima .*immagine originale\."\)/);
  assert.match(editor, /setSource\(URL\.createObjectURL\(file\)\)/);
  assert.match(editor, /URL\.revokeObjectURL\(source\)/);
  assert.match(editor, />Reset</);
  assert.match(editor, />Annulla</);
  assert.match(editor, /getMyAvatarOriginalAction/);
  assert.match(editor, /requestAnimationFrame/);
  assert.match(editor, /translate3d/);
  assert.match(editor, /defaultValue="1"/);
  assert.match(editor, /onInput=/);
  assert.doesNotMatch(editor, /setZoom/);
  assert.match(editor, /createCroppedFile/);
  assert.match(editor, /formData\.set\("original", originalFile\)/);
  assert.doesNotMatch(editor, /source \?\? avatarUrl/);
});

test("avatar pubblico invalida deterministicamente la cache dopo update", () => {
  const avatar = read("src", "lib", "account", "avatar.ts");
  const server = read("src", "lib", "account", "server.ts");
  const profile = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(avatar, /versionAvatarUrl/);
  assert.match(server, /select\("id,username,avatar_url,updated_at"\)/);
  assert.match(profile, /avatar_url,updated_at/);
  assert.match(server + profile, /versionAvatarUrl\(public(?:Avatar)?Url, profile\.updated_at\)/);
  assert.doesNotMatch(avatar, /Math\.random|Date\.now/);
});

test("originale avatar resta privato, isolato per utente e limitato a 750 KB", () => {
  const migration = read("supabase", "migrations", "202608110001_account_avatar_originals.sql");
  const action = read("src", "app", "account", "actions.ts");
  const avatar = read("src", "lib", "account", "avatar.ts");
  assert.match(migration, /'account-avatar-originals'[\s\S]*false,[\s\S]*768000/);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(migration, /for select to authenticated[\s\S]*owner_id = \(select auth\.uid\(\)::text\)/);
  assert.match(migration, /for insert to authenticated[\s\S]*storage\.foldername\(name\)/);
  assert.match(migration, /for update to authenticated[\s\S]*for delete to authenticated/);
  assert.doesNotMatch(migration, /\bpublic\s*=\s*true/);
  assert.match(avatar, /ACCOUNT_AVATAR_MAX_BYTES = 750 \* 1024/);
  assert.match(action, /ACCOUNT_AVATAR_ORIGINAL_BUCKET/);
  assert.match(action, /createSignedUrl\(path, 300\)/);
  assert.match(action, /isOwnedAvatarOriginalPath\(item, user\.id\)/);
  assert.match(action, /console\.error\(`\[account\/avatar-\$\{persistence\.step\}\] failed`/);
  assert.match(action, /safeBackendError\(persistence\.error\)/);
  assert.doesNotMatch(action, /return \{ message: "[^"]*(?:migration|bucket|policy|SQL|service role)/i);
  assert.doesNotMatch(read("src", "app", "user", "[username]", "AvatarEditorModal.tsx"), /aria-label="Chiudi"|migration avatar|bucket|policy/);
});

test("catalogo supporto usa storia, ranking e trofei reali con tutti i filtri", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  const catalog = read("src", "lib", "account", "support-catalog.server.ts");
  assert.match(page, /getActiveSocietaCatalog\(\)/);
  assert.match(catalog, /"data", "sala_trofei\.csv"/);
  assert.match(page, /story: team\.storia_tifo\?\.trim\(\) \?\? ""/); assert.match(selector, /data-support-full-story/);
  assert.match(page, /rankingById\.get\(team\.id\)/); assert.match(page, /trophyCounts\.get\(team\.id\)/);
  assert.doesNotMatch(page, /\bgetSocieta\(|supportTeasers|select\("id,categoria,girone,storia"\)/);
  assert.match(selector, /Filtra per lega/); assert.match(selector, /\['trophies', 'Trofei'\]/);
  assert.match(selector, /\['ranking', 'Ranking'\]/); assert.match(selector, /\['name', 'Nome'\]/);
  assert.match(selector, /placeholder="Cerca societ/); assert.match(selector, /aria-label=\{`Scopri \$\{team\.name\}`\}/);
});

test("catalogo club usa dieci colonne desktop e quattro mobile senza descrizioni nelle card", () => {
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(selector, /grid-cols-4[^"]*lg:grid-cols-10/);
  assert.match(selector, /\{filtered\.map\(\(team\)/); assert.doesNotMatch(selector, /filtered\.slice\(/);
  const card = selector.slice(selector.indexOf("filtered.map"), selector.indexOf("data-support-team-dialog"));
  assert.match(card, /team\.logo/); assert.match(card, /team\.name/); assert.match(card, /team\.ranking/); assert.match(card, /team\.trophies/);
  assert.doesNotMatch(card, /team\.emblemsUnlocked|team\.emblemsTotal|team\.emblemsDefending|Emblemi/);
  assert.match(card, /data-support-team-card/); assert.equal((card.match(/<button data-support-team-card/g) ?? []).length, 1);
  assert.match(card, /h-\[10rem\][\s\S]*min-h-\[10rem\][\s\S]*lg:h-\[10\.5rem\][\s\S]*lg:min-h-\[10\.5rem\]/); assert.match(card, /truncate/);
  assert.match(card, /grid-rows-\[3\.75rem_2\.75rem_2\.5rem\][\s\S]*lg:grid-rows-\[5rem_2rem_2rem\]/);
  assert.match(card, /data-support-card-logo[\s\S]*data-support-card-name[\s\S]*data-support-card-meta/);
  assert.match(card, /data-support-card-logo[^>]*overflow-hidden/); assert.match(card, /max-h-full max-w-full object-contain/);
  assert.match(card, /data-support-card-name[^>]*uppercase[\s\S]*<SupportTeamName name=\{team\.name\}/);
  assert.match(card, /data-support-card-meta[^>]*flex-col[^>]*lg:flex-row/);
  assert.doesNotMatch(card, /team\.story|absolute|(?:^|\s)-m[trblxy]?-\d/);
  assert.match(selector, /overflow-y-auto overflow-x-hidden/);
  assert.match(selector, /auto-rows-max/); assert.doesNotMatch(selector, /auto-rows-fr/);
  assert.match(selector, /gap-2\.5/); assert.match(selector, /lg:gap-3/);
});

test("catalogo supporto usa storia_tifo Supabase senza generarla a runtime", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(page, /story: team\.storia_tifo\?\.trim\(\) \?\? ""/);
  assert.doesNotMatch(page, /story: team\.storia\b/);
  assert.doesNotMatch(page, /getSupportTeamTeasers|supportTeasers|stagioneIngresso|badgeNewEntry/);
  assert.match(selector, /data-support-full-story[\s\S]*>Storia<[\s\S]*touch-pan-y overflow-y-auto/);
  assert.doesNotMatch(selector, /line-clamp-6/);
  assert.match(selector, /data-support-card-name[^>]*uppercase/); assert.match(selector, /<h3[^>]*uppercase/);
});

test("nomi catalogo attivano marquee soltanto su overflow e rispettano reduced motion", () => {
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  const marquee = selector.slice(selector.indexOf("function SupportTeamName"), selector.indexOf("export default function ProfileSupportSelector"));
  assert.match(marquee, /text\.scrollWidth - container\.clientWidth/);
  assert.match(marquee, /distance > 0 \?/); assert.match(marquee, /ResizeObserver/);
  assert.match(marquee, /prefers-reduced-motion: reduce/); assert.match(marquee, /motion\.matches \? 0/);
  assert.match(marquee, /title=\{name\}/); assert.match(marquee, /aria-label=\{name\}/);
  assert.match(selector, /support-name-scroll[\s\S]*0%, 18%[\s\S]*70%, 86%[\s\S]*100%/);
  assert.match(selector, /--support-name-duration/); assert.match(selector, /animation: none/);
});

test("card supporto usa profondita premium e hover contenuto", () => {
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  const card = selector.slice(selector.indexOf("filtered.map"), selector.indexOf("data-support-team-dialog"));
  assert.match(card, /bg-\[linear-gradient\(155deg/); assert.match(card, /inset_0_1px_0/);
  assert.match(card, /ring-1 ring-slate-200\/70/); assert.match(card, /duration-200/);
  assert.match(card, /lg:hover:-translate-y-0\.5/); assert.doesNotMatch(card, /hover:scale|neon|shadow-\[[^\]]*(?:#0ff|#f0f)/i);
  assert.match(card, /drop-shadow-[^\s"]+/); assert.match(card, /object-contain/);
});

test("conteggio emblemi societa usa soltanto dati reali del catalogo", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /getCatalogoEmblemi, getEmblemiSocieta/);
  assert.match(page, /const emblemTotal = getCatalogoEmblemi\(\)\.length/);
  assert.match(page, /emblem\.stato === "Sbloccato"/);
  assert.match(page, /emblem\.stato === "Da difendere"/);
  assert.match(page, /emblemsUnlocked: emblems\?\.unlocked \?\? 0/);
  assert.match(page, /emblemsDefending: emblems\?\.defending \?\? 0/);
  assert.doesNotMatch(page, /emblemsUnlocked:\s*(?:Math\.random|12)|emblemsTotal:\s*38/);
});

test("popup societa mostra storia e salva soltanto dalla conferma definitiva", () => {
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(selector, /onClick=\{\(\) => setSelected\(team\)\}/);
  assert.match(selector, /data-support-team-dialog/); assert.match(selector, /\{selected\.story\}/);
  assert.match(selector, /selected\.emblemsUnlocked/); assert.match(selector, /selected\.emblemsTotal/);
  assert.match(selector, /selected\.emblemsDefending > 0/); assert.doesNotMatch(selector, />0 da difendere</);
  assert.match(selector, /Sei sicuro di voler scegliere \{selected\.name\}\?/);
  assert.match(selector, /La scelta resterà valida fino al termine della stagione e non potrà essere modificata/);
  assert.match(selector, /data-support-confirm[\s\S]*CONFERMA!/);
  assert.match(selector, /TORNA ALLA SELEZIONE/); assert.match(selector, /onClick=\{\(\) => setSelected\(null\)\}/);
  assert.equal((selector.match(/<form action=\{action\}/g) ?? []).length, 1);
});

test("confetti supporto parte solo dopo successo e termina prima del refresh", () => {
  const selector = read("src", "app", "user", "[username]", "ProfileSupportSelector.tsx");
  assert.match(selector, /if \(!state\.success \|\| celebrated\.current\) return/);
  assert.match(selector, /setCelebrating\(true\)/); assert.match(selector, /1400/);
  assert.match(selector, /setOpen\(false\); router\.refresh\(\)/);
  assert.doesNotMatch(selector, /if \(state\.message\)[\s\S]*setCelebrating\(true\)/);
});

test("Punti Tifo usa ledger idempotente e soltanto partite di campionato calcolate", () => {
  assert.match(supportPointsMigration, /create table public\.fantabet_support_match_events/);
  assert.match(supportPointsMigration, /unique \(profile_id, partita_id\)/);
  assert.match(supportPointsMigration, /competition\.tipo = 'campionato'/);
  assert.match(supportPointsMigration, /game\.stato = 'calcolata'/);
  assert.match(supportPointsMigration, /game\.gol_casa is not null[\s\S]*game\.gol_trasferta is not null/);
  assert.match(supportPointsMigration, /then 1[\s\S]*then 3[\s\S]*else 0/);
  assert.match(supportPointsMigration, /on conflict \(profile_id, partita_id\) do update/);
  assert.match(supportPointsMigration, /punti = excluded\.punti[\s\S]*outcome = excluded\.outcome/);
  assert.match(supportPointsMigration, /delete from public\.fantabet_support_match_events/);
});

test("reset testesterno è manuale, test-only e rispetta dipendenze e trigger", () => {
  assert.match(testSupportReset, /TEST ONLY/); assert.match(testSupportReset, /username_normalizzato/);
  assert.match(testSupportReset, /season\.attiva = true/);
  assert.ok(testSupportReset.indexOf("fantabet_support_bonus_events") < testSupportReset.indexOf("profile_support_ineligibilities"));
  assert.ok(testSupportReset.indexOf("profile_support_ineligibilities") < testSupportReset.indexOf("disable trigger profile_supports_immutable"));
  assert.match(testSupportReset, /enable trigger profile_supports_immutable/);
  assert.match(testSupportReset, /v_target_count > 1[\s\S]*raise exception/);
  assert.match(testSupportReset, /v_target_count = 0[\s\S]*raise notice/);
});

test("migration history congela la 002 e sposta i fix stagionali nella 003", () => {
  assert.doesNotMatch(supportMigration, /create or replace function private\.fantabet_global_leaderboard_unfiltered/);
  const deployedLeaderboard = supportMigration.slice(supportMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.doesNotMatch(deployedLeaderboard, /bonus_by_profile[\s\S]*season\.attiva = true/);
  assert.match(supportPointsMigration, /create or replace function private\.fantabet_global_leaderboard_unfiltered/);
  assert.match(supportPointsMigration, /with active_rounds as[\s\S]*season\.attiva = true/);
  assert.doesNotMatch(supportPointsMigration, /alter function public\.fantabet_global_leaderboard\(\) set schema private/i);
  assert.match(supportPointsMigration, /^begin;[\s\S]*commit;\s*$/);
  assert.match(supportPointsMigration, /drop function if exists public\.public_profile_support_summary\(uuid\)/);
  assert.match(supportPointsMigration, /drop function public\.fantabet_global_leaderboard\(\)/);
  assert.match(supportMigration, /create function public\.fantabet_global_leaderboard\(\)/);
  assert.match(supportMigration, /rename to fantabet_base_leaderboard/);
  assert.match(supportPointsMigration, /create or replace function private\.fantabet_global_leaderboard_unfiltered\(\)/);
  assert.match(leaderboardVisibilityMigration, /rename to fantabet_global_leaderboard_unfiltered/);
});

test("leaderboard e riepilogo tifo usano esclusivamente la stagione attiva", () => {
  assert.match(supportPointsMigration, /trophy_points as[\s\S]*season\.attiva = true/);
  assert.match(supportPointsMigration, /support_points as[\s\S]*season\.attiva = true/);
  assert.match(supportPointsMigration, /public_profile_support_summary[\s\S]*season\.attiva = true/);
});

test("visibilita leaderboard richiede almeno una giornata FantaBet valutata", () => {
  assert.match(supportPointsMigration, /complete_rounds as[\s\S]*evaluation\.fully_evaluable/);
  assert.match(supportPointsMigration, /scored_slips as[\s\S]*join complete_rounds complete/);
  assert.match(supportPointsMigration, /prediction_totals as[\s\S]*count\(\*\)::bigint as giornate_giocate/);
  assert.match(leaderboardVisibilityMigration, /where source\.giornate_giocate > 0/);
  assert.match(supportMigration, /rename to fantabet_base_leaderboard/);
  const leaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /from private\.fantabet_base_leaderboard\(\) source/);
  assert.doesNotMatch(leaderboard, /from (?:support_points|trophy_points)\b/);

  const visible = ({ evaluatedRounds = 0 }) => evaluatedRounds > 0;
  assert.equal(visible({ evaluatedRounds: 0, openSubmission: true }), false);
  assert.equal(visible({ evaluatedRounds: 0, expiredSubmission: true, fullyEvaluable: false }), false);
  assert.equal(visible({ evaluatedRounds: 1, fullyEvaluable: true }), true);
  assert.equal(visible({ evaluatedRounds: 0, puntiTifo: 3 }), false);
  assert.equal(visible({ evaluatedRounds: 0, puntiBonusTifo: 50 }), false);

  const entered = { pronostici: 18, costanza: 10, tifo: 3, trofei: 50 };
  assert.equal(entered.pronostici + entered.costanza + entered.tifo + entered.trofei, 81);
});

test("sync Punti Tifo riconcilia correzioni e invalidazioni senza duplicati", () => {
  assert.match(supportPointsMigration, /on conflict \(profile_id, partita_id\) do update/);
  assert.match(supportPointsMigration, /is distinct from excluded\.punti[\s\S]*is distinct from excluded\.outcome/);
  assert.match(supportPointsMigration, /delete from public\.fantabet_support_match_events event[\s\S]*not exists/);
  assert.match(supportPointsMigration, /p_partita_id is null or event\.partita_id = p_partita_id/);
  assert.match(supportPointsMigration, /after insert or update of stato, gol_casa, gol_trasferta/);
  const points = (home, away, supportsHome = true) => home === away ? 1 : (supportsHome ? home > away : away > home) ? 3 : 0;
  assert.equal(points(2, 1), 3); assert.equal(points(2, 2), 1); assert.equal(points(1, 2), 0);
});

test("Punti Tifo non sono retroattivi, escludono ufficiali e restano separati in leaderboard", () => {
  assert.match(supportPointsMigration, /eligible_from_giornata/);
  assert.match(supportPointsMigration, /max\(game\.giornata_lega\) \+ 1/);
  assert.match(supportPointsMigration, /game\.giornata_lega >= support\.eligible_from_giornata/);
  assert.doesNotMatch(supportPointsMigration, /game\.updated_at|partite\.updated_at/);
  assert.match(supportPointsMigration, /profile\.societa_id is null/);
  assert.match(supportPointsMigration, /profile_support_ineligibilities/);
  assert.match(supportPointsMigration, /punti_bonus_costanza bigint, punti_tifo bigint, punti_bonus_tifo bigint/);
  assert.match(supportPointsMigration, /totals\.punti_totali \+ totals\.punti_tifo/);
});

test("profilo mobile tiene azioni e cinque trofei su una sola riga senza label visive", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /data-mobile-profile-actions/);
  assert.match(page, /grid grid-cols-5 gap-1 sm:gap-2/);
  assert.doesNotMatch(page, /title=\{label\}>\{label\}/);
  assert.match(page, /<span className="sr-only">\{label\}<\/span>/);
});

test("RPC pubblica espone solo riepilogo tifo e non identità sensibili", () => {
  const summary = supportMigration.slice(supportMigration.indexOf("create function public.public_profile_support_summary"), supportMigration.indexOf("-- Preserve the currently deployed"));
  assert.match(summary, /punti_bonus_tifo bigint/); assert.match(summary, /trophy_types text\[\]/);
  assert.match(summary, /profile_support_ineligibilities/);
  assert.doesNotMatch(summary, /auth\.users|\bemail\b/i);
});

test("tifo stagionale è storico, unico e immutabile", () => {
  assert.match(supportMigration, /create table public\.profile_supports/);
  assert.match(supportMigration, /primary key \(profile_id, stagione_id\)/);
  assert.match(supportMigration, /before update or delete on public\.profile_supports/);
  assert.match(supportMigration, /raise exception 'profile_support_immutable'/);
  assert.doesNotMatch(supportMigration, /grant[^;]*(?:update|delete)[^;]*profile_supports[^;]*authenticated/is);
});

test("solo un esterno può scegliere per sé nella stagione attiva", () => {
  assert.equal(canSelectSupportedTeam(null, false), true);
  assert.equal(canSelectSupportedTeam(12, false), false);
  assert.equal(canSelectSupportedTeam(null, true), false);
  assert.match(supportMigration, /values \(auth\.uid\(\), p_stagione_id, p_societa_id\)/);
  assert.match(supportMigration, /v_profile\.societa_id is not null[\s\S]*official_profile_cannot_support/);
  assert.match(supportMigration, /where id = p_stagione_id and attiva = true/);
  assert.match(supportMigration, /support_already_selected/);
});

test("una nuova stagione consente una nuova scelta senza perdere lo storico", () => {
  assert.match(supportMigration, /primary key \(profile_id, stagione_id\)/);
  assert.doesNotMatch(supportMigration, /delete from public\.profile_supports/i);
});

test("conteggio tifosi usa la stagione attiva ed esclude gli ufficiali", () => {
  const counter = supportMigration.slice(supportMigration.indexOf("create function public.active_supporter_counts"), supportMigration.indexOf("-- Winner belongs"));
  assert.match(counter, /season\.attiva = true/);
  assert.match(counter, /profile\.societa_id is null/);
  assert.match(counter, /group by support\.societa_id/);
});

test("scala Bonus Tifo è completa e cumulabile", () => {
  assert.deepEqual(SUPPORT_BONUS_POINTS, { campionato: 50, coppaFanta20: 40, championsLeague: 30, europaLeague: 20, conferenceLeague: 10 });
  assert.equal(supportBonusTotal([50, 30]), 80);
  assert.equal(supportBonusTotal([50, 40, 30, 20, 10]), 150);
});

test("mapping bonus intercetta esattamente i codici competizione reali", () => {
  for (const code of ["serie-a", "serie-b", "serie-c-girone-a", "serie-c-girone-b", "serie-c-girone-c"]) {
    assert.match(competitionsMigration, new RegExp(`'${code}', '[^']+', 'campionato'`));
  }
  for (const prefix of ["champions-league", "europa-league", "conference-league"]) {
    for (const suffix of ["serie-a", "serie-b", "serie-c-girone-a", "serie-c-girone-b", "serie-c-girone-c"]) {
      assert.match(competitionsMigration, new RegExp(`'${prefix}-${suffix}'`));
    }
  }
  assert.match(competitionsMigration, /'coppa-fanta-20', 'Coppa Fanta a 20', 'coppa_nazionale'/);
  assert.match(supportMigration, /competition\.tipo = 'campionato'/);
  assert.match(supportMigration, /competition\.codice = 'coppa-fanta-20'/);
});

test("bonus nasce solo da un trofeo concluso ed è idempotente", () => {
  assert.match(supportMigration, /societa_vincitrice_id is null or stato = 'conclusa'/);
  assert.match(supportMigration, /edition\.stato = 'conclusa'/);
  assert.match(supportMigration, /unique \(profile_id, edizione_competizione_id\)/);
  assert.match(supportMigration, /on conflict \(profile_id, edizione_competizione_id\) do nothing/);
  assert.match(supportMigration, /private\.sync_fantabet_support_bonus_events\(new\.id\)/);
});

test("sync usa il riconoscimento persistito e non assegna bonus retroattivi", () => {
  assert.equal(isSupportBonusEligible("2026-08-01T10:00:00Z", "2027-05-20T20:00:00Z", false), true);
  assert.equal(isSupportBonusEligible("2027-05-21T10:00:00Z", "2027-05-20T20:00:00Z", false), false);
  assert.equal(isSupportBonusEligible("2026-08-01T10:00:00Z", "2027-05-20T20:00:00Z", true), false);
  assert.match(supportMigration, /winner_recorded_at timestamptz null/);
  assert.match(supportMigration, /support\.selected_at <= edition\.winner_recorded_at/);
  assert.match(supportMigration, /recognized_at[\s\S]*edition\.winner_recorded_at/);
  const sync = supportMigration.slice(supportMigration.indexOf("create function private.sync_fantabet_support_bonus_events"), supportMigration.indexOf("create function private.trigger_sync_fantabet_support_bonus_events"));
  assert.doesNotMatch(sync, /recognized_at[^\n]*now\(\)|winner_recorded_at[^\n]*now\(\)/i);
});

test("sync globale riconcilia edizioni concluse ed è ripetibile", () => {
  const sync = supportMigration.slice(supportMigration.indexOf("create function private.sync_fantabet_support_bonus_events"), supportMigration.indexOf("create function private.trigger_sync_fantabet_support_bonus_events"));
  assert.match(sync, /p_edizione_competizione_id bigint default null/);
  assert.match(sync, /p_edizione_competizione_id is null or edition\.id = p_edizione_competizione_id/);
  assert.match(sync, /on conflict \(profile_id, edizione_competizione_id\) do nothing/);
  assert.match(sync, /get diagnostics v_inserted = row_count/);
});

test("ledger mantiene lo storico ma un profilo diventato ufficiale riceve zero", () => {
  assert.doesNotMatch(supportMigration, /delete from public\.fantabet_support_bonus_events/i);
  assert.equal(canSelectSupportedTeam(7, false), false);
  const award = supportMigration.slice(supportMigration.indexOf("create function private.sync_fantabet_support_bonus_events"), supportMigration.indexOf("create function private.trigger_sync_fantabet_support_bonus_events"));
  const leaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.match(award, /profile\.societa_id is null/);
  assert.match(leaderboard, /where profile\.societa_id is null/);
  assert.match(supportMigration, /create table public\.profile_support_ineligibilities/);
  assert.match(supportMigration, /old\.societa_id is null and new\.societa_id is not null/);
  assert.match(supportMigration, /profiles_freeze_supports_after_officialization/);
  assert.match(award, /not exists \([\s\S]*profile_support_ineligibilities[\s\S]*ineligibility\.stagione_id = support\.stagione_id/);
  assert.match(leaderboard, /ineligibility\.stagione_id = event\.stagione_id/);
});

test("leaderboard separa le componenti Tifo, aggiorna totale e ranking", () => {
  const leaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /punti_tifo bigint/);
  assert.match(leaderboard, /punti_bonus_tifo bigint/);
  assert.match(leaderboard, /totals\.punti_totali \+ totals\.punti_tifo \+ totals\.punti_bonus_tifo/);
  assert.match(leaderboard, /order by[\s\S]*totals\.punti_totali \+ totals\.punti_tifo \+ totals\.punti_bonus_tifo desc,[\s\S]*totals\.schedine_perfette desc,[\s\S]*totals\.pronostici_corretti desc,[\s\S]*totals\.username_normalizzato,[\s\S]*totals\.profile_id/);
  assert.doesNotMatch(leaderboard, /order by[^;]*totals\.posizione/);
  assert.doesNotMatch(leaderboard, /auth\.users|\bemail\b/i);
  assert.match(supportMigration, /rename to fantabet_base_leaderboard/);
  assert.match(leaderboard, /from private\.fantabet_base_leaderboard\(\) source/);
  assert.doesNotMatch(supportMigration, /fantabet_global_leaderboard_without_support_bonus/);
});

test("parità sul totale dopo Bonus Tifo usa gli spareggi ufficiali", () => {
  const rows = [
    { id: "a", username: "alpha", base: 100, tifo: 0, perfette: 1, corretti: 20 },
    { id: "b", username: "beta", base: 90, tifo: 10, perfette: 2, corretti: 18 },
  ];
  rows.sort((a, b) => (b.base + b.tifo) - (a.base + a.tifo) || b.perfette - a.perfette || b.corretti - a.corretti || a.username.localeCompare(b.username) || a.id.localeCompare(b.id));
  assert.equal(rows[0].id, "b");
  const leaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.doesNotMatch(leaderboard, /order by[^;]*(?:source|totals)\.punti_pronostici/);
});

test("ineligibilità ufficiale è stagionale e non si riattiva tornando esterno", () => {
  const freeze = supportMigration.slice(supportMigration.indexOf("create function private.freeze_profile_supports_after_officialization"), supportMigration.indexOf("create trigger profiles_freeze_supports_after_officialization"));
  assert.match(freeze, /insert into public\.profile_support_ineligibilities/);
  assert.match(freeze, /select support\.profile_id, support\.stagione_id/);
  assert.match(supportMigration, /primary key \(profile_id, stagione_id\)/);
  assert.doesNotMatch(supportMigration, /delete from public\.profile_support_ineligibilities/i);
  assert.equal(canSelectSupportedTeam(null, false), true);
});

test("Bonus Tifo non rende visibili profili privi di round valutate", () => {
  const leaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /from private\.fantabet_base_leaderboard\(\) source/);
  assert.match(leaderboard, /left join trophy_points trophy/);
  assert.doesNotMatch(leaderboard, /from trophy_points trophy\s+left join private\.fantabet_base_leaderboard/i);
});

test("wrapper finale rende visibili soltanto profili con giornate_giocate maggiori di zero", () => {
  const leaderboard = visibilityAndStoryMigration.slice(visibilityAndStoryMigration.indexOf("create or replace function public.fantabet_global_leaderboard"));
  assert.match(leaderboard, /from private\.fantabet_base_leaderboard\(\) source/);
  assert.match(leaderboard, /where source\.giornate_giocate > 0/);
  assert.doesNotMatch(leaderboard, /punti_totali\s*>\s*0|punti_tifo\s*>\s*0|punti_bonus_tifo\s*>\s*0/);
  assert.match(leaderboard, /totals\.punti_totali \+ totals\.punti_tifo \+ totals\.punti_bonus_tifo/);
});

test("fix visibility è incrementale e non modifica scoring o migration applicate", () => {
  assert.match(visibilityAndStoryMigration, /^begin;/);
  assert.match(visibilityAndStoryMigration, /commit;\s*$/);
  assert.doesNotMatch(visibilityAndStoryMigration, /create or replace function private\.fantabet_base_leaderboard|fantabet_prediction_results|earned_points|consistency_totals/);
});

test("public leaderboard continua dalla base filtrata e aggiunge Tifo soltanto dopo", () => {
  const publicLeaderboard = supportPointsMigration.slice(supportPointsMigration.indexOf("create function public.fantabet_global_leaderboard"));
  assert.match(baseVisibilityMigration, /from totals\s+where totals\.giornate_giocate > 0/);
  assert.match(publicLeaderboard, /from private\.fantabet_base_leaderboard\(\) source/);
  assert.match(publicLeaderboard, /left join support_points support/);
  assert.match(publicLeaderboard, /left join trophy_points trophy/);
  assert.doesNotMatch(publicLeaderboard, /from support_points support\s+(?:left|right|full)?\s*join private\.fantabet_base_leaderboard/i);
  assert.doesNotMatch(publicLeaderboard, /from trophy_points trophy\s+(?:left|right|full)?\s*join private\.fantabet_base_leaderboard/i);
  assert.match(publicLeaderboard, /totals\.punti_totali \+ totals\.punti_tifo \+ totals\.punti_bonus_tifo/);
});

test("RLS impedisce scritture client arbitrarie e la server action riusa la RPC", () => {
  const action = read("src", "app", "account", "support-actions.ts");
  assert.match(supportMigration, /alter table public\.profile_supports enable row level security/);
  assert.match(supportMigration, /alter table public\.fantabet_support_bonus_events enable row level security/);
  assert.doesNotMatch(supportMigration, /grant[^;]*insert[^;]*(?:anon|authenticated)/is);
  assert.match(action, /formData\.get\("confirmed"\) !== "true"/);
  assert.match(action, /supabase\.rpc\("select_my_supported_team"/);
  assert.doesNotMatch(action, /SERVICE_ROLE|service_role|auth\.users|email/i);
});

test("sync privata è negata ai client ma disponibile alla service role", () => {
  assert.match(supportMigration, /revoke all on function private\.sync_fantabet_support_bonus_events\(bigint\)[\s\S]*from public, anon, authenticated/);
  assert.match(supportMigration, /grant usage on schema private to service_role/);
  assert.match(supportMigration, /grant execute on function private\.sync_fantabet_support_bonus_events\(bigint\)\s+to service_role;/);
  assert.doesNotMatch(supportMigration, /grant execute on function private\.sync_fantabet_support_bonus_events\(bigint\)\s+to (?:anon|authenticated)/);
});
