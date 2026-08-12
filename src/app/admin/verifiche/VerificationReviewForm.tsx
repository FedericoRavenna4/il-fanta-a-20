"use client";

import { useActionState } from "react";
import { reviewVerificationAction, type ReviewVerificationState } from "./actions";

function ActionIcon({ decision }: { decision: "approved" | "rejected" }) {
  return decision === "approved"
    ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4 4L19 7" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>;
}

export default function VerificationReviewForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<ReviewVerificationState, FormData>(reviewVerificationAction, { message: "" });
  return <form action={action} className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
    <input type="hidden" name="requestId" value={requestId} />
    {(["approved", "rejected"] as const).map((decision) => { const approve = decision === "approved"; const label = approve ? "Approva richiesta" : "Rifiuta richiesta"; return <button key={decision} type="submit" disabled={pending} name="decision" value={decision} aria-label={label} title={label} className={`grid h-11 w-11 place-items-center rounded-xl border transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-40 ${approve ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus-visible:outline-emerald-600" : "border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200 focus-visible:outline-rose-600"}`}><ActionIcon decision={decision} /></button>; })}
    {state.message && <span role="status" className={`fixed bottom-4 left-1/2 z-[140] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border bg-white px-4 py-3 text-center text-xs font-black shadow-xl ${state.success ? "border-emerald-200 text-emerald-800" : "border-rose-200 text-rose-800"}`}>{state.message}</span>}
  </form>;
}
