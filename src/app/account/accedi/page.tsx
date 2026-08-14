import type { Metadata } from "next";
import Link from "next/link";
import { safeAccountReturnUrl } from "@/lib/account/return-url";
import AccountShell from "../AccountShell";
import AuthForm from "../AuthForm";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Accedi", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo=safeAccountReturnUrl((await searchParams).returnTo,"");
  return <AccountShell eyebrow="Account Fanta a 20" title="Accedi" description="Ritrova il tuo account su qualsiasi dispositivo."><AuthForm action={loginAction} hiddenFields={returnTo?{returnTo}:{}} fields={[{ name: "identifier", label: "Email o username", type: "text", autoComplete: "username" }, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }]} submitLabel="Accedi" footer={{ text: "Non hai un account?", href: "/account/registrati", label: "Registrati" }} /><p className="mt-3 text-center"><Link href="/account/password-dimenticata" className="text-sm font-black text-slate-500 hover:text-blue-950">Password dimenticata?</Link></p></AccountShell>;
}
