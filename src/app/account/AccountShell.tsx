import type { ReactNode } from "react";

export default function AccountShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <main className="bg-[linear-gradient(180deg,#f8fbff,#eef5fb)] px-4 py-10 sm:py-16"><section className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10 sm:p-8"><p className="section-eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-black uppercase text-blue-950 sm:text-4xl">{title}</h1><p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>{children}</section></main>;
}
