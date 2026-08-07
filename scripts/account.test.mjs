import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeAccountUsername, validateAccountUsername } from "../src/lib/account/username.ts";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "202608070001_account_profiles.sql");

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
