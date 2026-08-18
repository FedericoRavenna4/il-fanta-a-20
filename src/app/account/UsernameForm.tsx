"use client";

import { useActionState, useState } from "react";
import { updateUsernameAction } from "./actions";

export default function UsernameForm({
  currentUsername,
}: {
  currentUsername: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateUsernameAction, {
    message: "",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Modifica username"
        title="Modifica username"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm transition hover:bg-white/20"
      >
        ✏️
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-dialog-title"
            className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-700">
                  Identità pubblica
                </p>
                <h2
                  id="username-dialog-title"
                  className="mt-1 text-2xl font-black text-blue-950"
                >
                  Cambia username
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-lg font-black text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>

            <form action={action} className="mt-5 space-y-4">
              <label className="block text-xs font-black uppercase tracking-wide text-blue-950">
                Nuovo username
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={24}
                  defaultValue={currentUsername}
                  autoComplete="username"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-sm font-bold normal-case outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                Puoi modificare lo username quando vuoi. La tua email rimane invariata.
                Gli username già utilizzati da altri account non sono disponibili.
              </div>

              {state.message && (
                <p
                  role="alert"
                  className={`text-sm font-bold ${
                    state.success ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {state.message}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="min-h-11 rounded-xl border border-slate-300 px-5 text-xs font-black uppercase text-blue-950 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annulla
                </button>

                <button
                  disabled={pending}
                  className="min-h-11 rounded-xl bg-blue-950 px-5 text-xs font-black uppercase text-white disabled:opacity-50"
                >
                  {pending ? "Salvataggio…" : "Salva username"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}