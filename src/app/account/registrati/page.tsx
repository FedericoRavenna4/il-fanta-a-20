import type { Metadata } from "next";
import AccountShell from "../AccountShell";
import AuthForm from "../AuthForm";
import { signUpAction } from "../actions";

export const metadata: Metadata = { title: "Registrati", robots: { index: false, follow: false } };
export default function SignUpPage() { return <AccountShell eyebrow="Account Fanta a 20" title="Registrati" description="Crea la tua identità unica per il portale."><AuthForm action={signUpAction} fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }, { name: "username", label: "Username pubblico", type: "text", autoComplete: "username", hint: "3-24 caratteri; lettere, numeri e underscore. Deve iniziare con una lettera." }, { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "Almeno 8 caratteri." }]} submitLabel="Crea account" footer={{ text: "Hai già un account?", href: "/account/accedi", label: "Accedi" }} /></AccountShell>; }
