import type { Metadata } from "next";
import Link from "next/link";
import AccountShell from "../AccountShell";

export const metadata: Metadata = { title: "Verifica email", robots: { index: false, follow: false } };
export default function VerifyEmailPage() { return <AccountShell eyebrow="Account creato" title="Verifica la tua email" description="Apri il messaggio inviato da Fanta a 20 e usa il link di conferma. Dopo la verifica potrai accedere al tuo account."><Link href="/account/accedi" className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 text-sm font-black uppercase tracking-[.12em] text-white">Vai all’accesso</Link></AccountShell>; }
