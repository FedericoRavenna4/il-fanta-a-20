import type { Metadata } from "next";
import AccountShell from "../AccountShell";
import AuthForm from "../AuthForm";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Nuova password", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <AccountShell eyebrow="Sicurezza account" title="Nuova password" description="Scegli una nuova password per il tuo account."><AuthForm action={resetPasswordAction} fields={[{ name: "password", label: "Nuova password", type: "password", autoComplete: "new-password" }, { name: "passwordConfirmation", label: "Conferma password", type: "password", autoComplete: "new-password" }]} submitLabel="Aggiorna password" /></AccountShell>; }
