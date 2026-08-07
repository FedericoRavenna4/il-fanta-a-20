"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadAvatarAction } from "./actions";
import { ACCOUNT_AVATAR_MAX_BYTES } from "@/lib/account/avatar";

function UploadButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="min-h-10 rounded-xl border border-blue-950/15 bg-white px-4 text-xs font-black uppercase tracking-[.12em] text-blue-950 transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60">{pending ? "Caricamento…" : "Cambia avatar"}</button>;
}

export default function AvatarUpload() {
  const [state, action] = useActionState(uploadAvatarAction, { message: "" });
  const [clientError, setClientError] = useState("");
  return <form action={action} className="mt-4" encType="multipart/form-data" onSubmit={(event) => {
    const file = new FormData(event.currentTarget).get("avatar");
    if (file instanceof File && file.size > ACCOUNT_AVATAR_MAX_BYTES) {
      event.preventDefault();
      setClientError("L’immagine non può superare 750 KB.");
    }
  }}><div className="flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1"><span className="sr-only">Scegli avatar</span><input name="avatar" type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => {
    const file = event.currentTarget.files?.[0];
    setClientError(file && file.size > ACCOUNT_AVATAR_MAX_BYTES ? "L’immagine non può superare 750 KB." : "");
  }} className="block w-full text-xs font-bold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-black file:text-blue-950" /></label><UploadButton /></div><p className="mt-2 text-[11px] font-semibold text-slate-500">JPG, PNG o WebP. Massimo 750 KB.</p>{clientError ? <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{clientError}</p> : state.message && <p role="status" className={`mt-2 text-xs font-bold ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>}</form>;
}
