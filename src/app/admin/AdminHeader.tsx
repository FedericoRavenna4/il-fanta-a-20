import Link from "next/link";
import { logoutAdminAction } from "./login/actions";

export default function AdminHeader({ eyebrow, title, username, href, linkLabel }: { eyebrow: string; title: string; username: string; href: string; linkLabel: string }) {
  return <header className="mb-4 border-b border-slate-200 pb-4 sm:mb-6 sm:pb-5"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><p className="section-eyebrow">{eyebrow}</p><h1 className="mt-1 truncate text-3xl font-black uppercase text-blue-950 sm:text-5xl">{title}</h1></div><div className="flex flex-col items-end gap-1.5"><form action={logoutAdminAction} className="flex max-w-full items-center gap-2"><span className="max-w-28 truncate text-[10px] font-black text-slate-500 sm:max-w-72">{username || "Admin"}</span><button className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-black uppercase text-blue-950">Esci</button></form><Link href={href} className="min-h-8 py-2 text-right text-[10px] font-black uppercase text-sky-700">{linkLabel}</Link></div></div></header>;
}
