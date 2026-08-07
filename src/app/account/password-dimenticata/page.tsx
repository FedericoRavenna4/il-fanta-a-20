import type { Metadata } from "next";
import AccountShell from "../AccountShell";
import AuthForm from "../AuthForm";
import { forgotPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Recupera password", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AccountShell eyebrow="Sicurezza account" title="Recupera password" description="Ti invieremo le istruzioni all’indirizzo associato all’account."><AuthForm action={forgotPasswordAction} fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} submitLabel="Invia istruzioni" footer={{ text: "Ricordi la password?", href: "/account/accedi", label: "Accedi" }} /></AccountShell>; }
