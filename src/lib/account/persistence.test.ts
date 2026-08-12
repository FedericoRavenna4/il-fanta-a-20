import assert from "node:assert/strict";
import test from "node:test";
import { persistAvatarFiles, profileCompletionMessage, safeBackendError } from "./persistence.ts";
import { versionAvatarUrl } from "./avatar.ts";

test("avatar nuovo salva originale, crop e profilo in ordine", async () => {
  const calls: string[] = [];
  const result = await persistAvatarFiles({
    uploadOriginal: async () => { calls.push("original"); return null; },
    uploadCrop: async () => { calls.push("crop"); return null; },
    updateProfile: async () => { calls.push("profile"); return null; },
  });
  assert.deepEqual(calls, ["original", "crop", "profile"]);
  assert.deepEqual(result, { ok: true, step: "complete" });
});

test("ritaglio successivo aggiorna crop senza sostituire originale", async () => {
  const calls: string[] = [];
  const result = await persistAvatarFiles({
    uploadCrop: async () => { calls.push("crop"); return null; },
    updateProfile: async () => { calls.push("profile"); return null; },
  });
  assert.deepEqual(calls, ["crop", "profile"]);
  assert.equal(result.ok, true);
});

test("errore originale interrompe prima di crop e profilo", async () => {
  const calls: string[] = [];
  const error = { status: 404, message: "Bucket not found" };
  const result = await persistAvatarFiles({
    uploadOriginal: async () => { calls.push("original"); return error; },
    uploadCrop: async () => { calls.push("crop"); return null; },
    updateProfile: async () => { calls.push("profile"); return null; },
  });
  assert.deepEqual(calls, ["original"]);
  assert.deepEqual(result, { ok: false, step: "original-upload", error });
});

test("errore crop non aggiorna il profilo", async () => {
  const calls: string[] = [];
  const error = { status: 403, message: "RLS denied" };
  const result = await persistAvatarFiles({
    uploadOriginal: async () => { calls.push("original"); return null; },
    uploadCrop: async () => { calls.push("crop"); return error; },
    updateProfile: async () => { calls.push("profile"); return null; },
  });
  assert.deepEqual(calls, ["original", "crop"]);
  assert.deepEqual(result, { ok: false, step: "crop-upload", error });
});

test("errore update profilo è distinto dagli upload", async () => {
  const error = { code: "22023", message: "AVATAR_NON_TROVATO" };
  const result = await persistAvatarFiles({ uploadCrop: async () => null, updateProfile: async () => error });
  assert.deepEqual(result, { ok: false, step: "profile-update", error });
});

test("errori backend sono loggabili senza token o payload sensibili", () => {
  const safe = safeBackendError({ name: "StorageApiError", message: "Bucket not found", status: 404, code: "404", access_token: "secret", cause: { password: "secret" } });
  assert.deepEqual(safe, { name: "StorageApiError", message: "Bucket not found", status: 404, code: "404", details: undefined, hint: undefined });
});

test("completamento profilo distingue username occupato da infrastruttura RPC assente", () => {
  assert.equal(profileCompletionMessage({ code: "23505", message: "duplicate key value violates unique constraint" }), "Username non disponibile o non valido.");
  assert.equal(profileCompletionMessage({ code: "PGRST202", message: "Could not find the function public.create_my_legacy_profile" }), "Non è stato possibile completare il profilo. Riprova più tardi.");
});

test("URL avatar usa una versione deterministica e non casuale", () => {
  assert.equal(versionAvatarUrl(null, "2026-08-12T10:00:00Z"), null);
  assert.equal(versionAvatarUrl("https://example.test/avatar.webp", null), "https://example.test/avatar.webp");
  assert.equal(versionAvatarUrl("https://example.test/avatar.webp", "2026-08-12T10:00:00Z"), "https://example.test/avatar.webp?v=2026-08-12T10%3A00%3A00Z");
});
