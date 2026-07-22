"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitWaitlistForm } from "./actions";
import { WAITLIST_HONEYPOT_FIELD } from "@/lib/waitlist/types";

const MOTIVATION_MAX_LENGTH = 1500;

export default function WaitlistForm() {
  const [state, formAction] = useActionState(submitWaitlistForm, null);
  const [motivationLength, setMotivationLength] = useState(0);

  if (state?.ok) return <WaitlistConfirmation position={state.position} />;

  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className="relative space-y-5">
      <div className="pointer-events-none absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="waitlist-website">Sito web</label>
        <input
          id="waitlist-website"
          type="text"
          name={WAITLIST_HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="nome"
          name="nome"
          label="Nome"
          autoComplete="given-name"
          placeholder="Il tuo nome"
          error={errors?.nome}
          maxLength={80}
          required
        />
        <FormField
          id="cognome"
          name="cognome"
          label="Cognome"
          autoComplete="family-name"
          placeholder="Il tuo cognome"
          error={errors?.cognome}
          maxLength={80}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="data_nascita"
          name="data_nascita"
          type="date"
          label="Data di nascita"
          help="La data serve esclusivamente per valutare la candidatura."
          error={errors?.data_nascita}
          autoComplete="bday"
          required
        />
        <FormField
          id="instagram"
          name="instagram"
          label="Nickname Instagram"
          help="Puoi inserirlo con o senza @. Ti contatteremo qui."
          placeholder="nomeutente"
          error={errors?.instagram}
          autoComplete="off"
          maxLength={31}
          required
        />
      </div>

      <div>
        <div className="flex items-end justify-between gap-4">
          <label htmlFor="motivazione" className="text-sm font-black uppercase tracking-[.08em] text-blue-950">
            Perché dovremmo scegliere te?
          </label>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-400">
            {motivationLength}/{MOTIVATION_MAX_LENGTH}
          </span>
        </div>
        <p id="motivazione-help" className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          Raccontaci cosa porteresti nella community. Minimo 30 caratteri.
        </p>
        <textarea
          id="motivazione"
          name="motivazione"
          required
          minLength={30}
          maxLength={MOTIVATION_MAX_LENGTH}
          rows={7}
          onChange={(event) => setMotivationLength(event.currentTarget.value.length)}
          aria-invalid={Boolean(errors?.motivazione)}
          aria-describedby={errors?.motivazione ? "motivazione-help motivazione-error" : "motivazione-help"}
          placeholder="La tua storia, il tuo modo di vivere il fantacalcio e ciò che ti rende la persona giusta..."
          className={inputClass(Boolean(errors?.motivazione), "min-h-44 resize-y py-3.5")}
        />
        <FieldError id="motivazione-error" message={errors?.motivazione} />
      </div>

      <div>
        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${errors?.privacy_accettata ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50/80 hover:border-blue-200"}`}>
          <input
            type="checkbox"
            name="privacy_accettata"
            value="true"
            required
            aria-invalid={Boolean(errors?.privacy_accettata)}
            aria-describedby={errors?.privacy_accettata ? "privacy-error" : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-blue-800"
          />
          <span className="text-xs font-semibold leading-5 text-slate-600 sm:text-sm">
            Accetto che i dati inseriti vengano utilizzati per valutare la candidatura e per essere ricontattato tramite Instagram.
          </span>
        </label>
        <FieldError id="privacy-error" message={errors?.privacy_accettata} />
      </div>

      {state && !state.ok && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {state.message}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function FormField({
  id,
  label,
  help,
  error,
  type = "text",
  ...props
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "type">) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-black uppercase tracking-[.08em] text-blue-950">{label}</label>
      {help && <p id={helpId} className="mt-1 text-xs font-semibold leading-5 text-slate-500">{help}</p>}
      <input
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        className={inputClass(Boolean(error))}
        {...props}
      />
      <FieldError id={errorId ?? `${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1.5 text-xs font-bold leading-5 text-rose-600">{message}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-13 w-full items-center justify-center rounded-full bg-blue-950 px-6 py-3.5 text-[11px] font-black uppercase tracking-[.16em] text-white shadow-[0_14px_34px_rgba(7,31,69,.2)] transition hover:-translate-y-0.5 hover:bg-blue-900 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-65 sm:w-auto sm:min-w-64"
    >
      {pending ? "Invio in corso…" : "Invia candidatura"}
    </button>
  );
}

function WaitlistConfirmation({ position }: { position: number }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-[linear-gradient(145deg,#f4fff9,#ffffff)] px-5 py-8 text-center shadow-[0_24px_70px_rgba(15,118,110,.1)] sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-72 -translate-x-1/2 rounded-full bg-emerald-200/35 blur-[65px]" />
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-100 text-xl font-black text-emerald-800 shadow-[0_10px_24px_rgba(16,185,129,.15)]" aria-hidden="true">✓</div>
      <p className="relative mt-5 text-[10px] font-black uppercase tracking-[.22em] text-emerald-700">Candidatura inviata!</p>
      <h2 className="relative mt-2 text-2xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl">Benvenuto nella lista d’attesa.</h2>
      <p className="relative mx-auto mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-600 sm:text-base sm:leading-7">
        Sei il <strong className="text-lg font-black text-blue-950">{position}°</strong> candidato ad aver richiesto un posto nel Fanta a 20.
      </p>
      <p className="relative mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-slate-500 sm:text-base sm:leading-7">
        Ogni candidatura viene letta personalmente. Se verrai selezionato, ti contatteremo tramite Instagram.
      </p>
      <p className="relative mt-5 font-black text-blue-950">Buona fortuna.</p>
      <Link href="/" className="relative mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-blue-950 px-7 text-[10px] font-black uppercase tracking-[.16em] text-white transition hover:-translate-y-0.5 hover:bg-blue-900">
        Torna alla home
      </Link>
    </div>
  );
}

function inputClass(error: boolean, extra = "") {
  return `mt-2 min-h-12 w-full min-w-0 rounded-2xl border bg-white px-4 text-base font-semibold text-blue-950 outline-none transition placeholder:text-slate-300 focus:ring-4 ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"} ${extra}`;
}
