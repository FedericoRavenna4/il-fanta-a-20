"use client";

import { useActionState } from "react";
import { completeLegacyProfileAction } from "./actions";

export default function CompleteProfileForm() {
  const [state, action, pending] = useActionState(completeLegacyProfileAction, { message: "" });
  return <form action={action} className="mt-6 space-y-3">
    <label className="block text-xs font-black uppercase tracking-wide text-blue-950">Scegli il tuo username<input name="username" required minLength={3} maxLength={24} autoComplete="username" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-sm font-bold normal-case" /></label>
    <p className="text-xs font-semibold text-slate-500">Sarà la tua identità pubblica e non potrà essere modificata liberamente.</p>
    {state.message && <p role="alert" className="text-sm font-bold text-rose-700">{state.message}</p>}
    <button disabled={pending} className="min-h-12 w-full rounded-xl bg-blue-950 px-5 text-xs font-black uppercase text-white disabled:opacity-50">{pending ? "Creazione…" : "Crea il profilo"}</button>
  </form>;
}
