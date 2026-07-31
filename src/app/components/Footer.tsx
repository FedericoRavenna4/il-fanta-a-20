import Image from "next/image";
import Link from "next/link";

const socialIconClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition duration-300 hover:-translate-y-0.5 hover:border-blue-950 hover:text-blue-950";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/55">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 text-slate-500 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-8 sm:px-6 sm:py-7">
        <div className="sm:justify-self-start">
          <p className="section-eyebrow">Info utili</p>
          <div className="mt-2 grid gap-1 text-xs font-semibold">
            <Link href="/regolamento" className="transition hover:text-blue-950">Regolamento</Link>
            <Link href="/lista-attesa" className="transition hover:text-blue-950">Lista di attesa</Link>
          </div>
        </div>

        <div className="order-first flex flex-col items-center text-center sm:order-none">
          <Image src="/logos/logo.png?v=20260730-1606" alt="F20" width={52} height={52} unoptimized className="h-10 w-auto drop-shadow-sm" />
          <p className="mt-1.5 text-xs font-black uppercase tracking-[0.14em] text-blue-950">Il Fanta a 20</p>
          <p className="mt-0.5 text-[10px] font-semibold">Il Fantacalcio Classic a 20 squadre</p>
        </div>

        <div className="sm:justify-self-end">
          <p className="section-eyebrow sm:text-right">Contatti</p>
          <div className="mt-2 flex items-center gap-2.5 text-xs font-semibold sm:justify-end">
            <a href="https://www.instagram.com/ilfanta_a20?igsh=MXNyMG82Zng3OWdpOQ==" target="_blank" rel="noopener noreferrer" aria-label="Apri il profilo Instagram de Il Fanta a 20" className={socialIconClass}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5" />
                <circle cx="12" cy="12" r="3.75" />
                <circle cx="17.5" cy="6.5" r=".75" className="fill-current stroke-none" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@ilfanta_a20?_r=1&_t=ZN-98UetBv0Z2U" target="_blank" rel="noopener noreferrer" aria-label="Apri il profilo TikTok de Il Fanta a 20" className={socialIconClass}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M14.2 3.2c.35 2.1 1.55 3.42 3.8 3.66v3.05a8.1 8.1 0 0 1-3.76-1.08v5.62a5.54 5.54 0 1 1-4.78-5.49v3.08a2.53 2.53 0 1 0 1.75 2.41V3.2h2.99Z" />
              </svg>
            </a>
            <a href="mailto:ilfantaa20@gmail.com" aria-label="Invia un’email a Il Fanta a 20" className={socialIconClass}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path d="M3.75 5.75h16.5v12.5H3.75z" />
                <path d="m4.5 7 7.5 5.75L19.5 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
