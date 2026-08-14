"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AccountActionState } from "./actions";

type Field = { name: string; label: string; type: string; autoComplete: string; hint?: string };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-2 min-h-12 w-full rounded-xl bg-blue-950 px-5 py-3 text-sm font-black uppercase tracking-[.12em] text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Attendi…" : label}</button>;
}

export default function AuthForm({ action, fields, submitLabel, footer, hiddenFields = {} }: { action: (state: AccountActionState, formData: FormData) => Promise<AccountActionState>; fields: Field[]; submitLabel: string; footer?: { text: string; href: string; label: string }; hiddenFields?: Record<string,string> }) {
  const [state, formAction] = useActionState(action, { message: "" });
  return <>
    <form action={formAction} className="mt-6 space-y-4">
      {Object.entries(hiddenFields).map(([name,value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {fields.map((field) => <label key={field.name} className="block text-sm font-bold text-blue-950">{field.label}<input name={field.name} type={field.type} autoComplete={field.autoComplete} required className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100" />{field.hint && <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span>}</label>)}
      {state.message && <p role="status" className={`rounded-xl p-3 text-sm font-bold ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{state.message}</p>}
      <SubmitButton label={submitLabel} />
    </form>
    {footer && <p className="mt-5 text-center text-sm font-semibold text-slate-500">{footer.text} <Link href={footer.href} className="font-black text-blue-950 hover:text-sky-600">{footer.label}</Link></p>}
  </>;
}
