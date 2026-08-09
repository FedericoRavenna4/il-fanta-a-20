import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { classifyAccountLogin, normalizeAccountUsername, validateAccountUsername } from "../src/lib/account/username.ts";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "202608070001_account_profiles.sql");
const avatarMigration = read("supabase", "migrations", "202608070002_account_avatars.sql");

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
  assert.match(page, /nome_ufficiale,categoria,girone/);
  assert.match(page, /\/societa\/\$\{localSocieta\.slug\}/);
});

test("admin legacy non riceve username inventati", () => {
  const page = read("src", "app", "account", "page.tsx");
  assert.match(page, /Account amministratore/);
  assert.match(page, /Profilo pubblico non configurato\./);
  assert.doesNotMatch(page, /Profilo da completare/i);
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
  assert.match(actions, /if \(profileError\) \{[\s\S]*?profile\.avatar_url !== path[\s\S]*?remove\(\[path\]\)/);
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

test("solo il proprietario del profilo pubblico vede Gestisci account", () => {
  const page = read("src", "app", "user", "[username]", "page.tsx");
  assert.match(page, /user\?\.id === profile\.id[\s\S]*href="\/account"[\s\S]*Gestisci account/);
});
