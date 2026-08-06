"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyAdminLoginAction } from "./actions";

const inputClass = "mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-blue-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

function LoginButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} aria-busy={pending} className="min-h-12 w-full rounded-xl bg-blue-950 px-5 font-black text-white transition hover:bg-sky-700 disabled:opacity-50">{pending ? "Accesso in corso…" : "Accedi"}</button>;
}

export default function LoginForm({ denied }: { denied: boolean }) {
  const [state, formAction] = useActionState(verifyAdminLoginAction, { message: denied ? "Credenziali non valide o accesso non autorizzato." : "" });
  return <form action={formAction} className="mt-6 space-y-4">
    <label className="block text-sm font-black text-blue-950">Email<input name="email" type="email" autoComplete="username" required className={inputClass} /></label>
    <label className="block text-sm font-black text-blue-950">Password<input name="password" type="password" autoComplete="current-password" required className={inputClass} /></label>
    {state.message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{state.message}</p>}
    <LoginButton />
  </form>;
}
