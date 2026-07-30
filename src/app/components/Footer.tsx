import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/55">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 text-slate-500 sm:grid-cols-2 sm:px-6 sm:py-11 lg:grid-cols-[1fr_auto_auto] lg:gap-14">
        <div>
          <p className="font-black text-blue-950">© Il Fanta a 20</p>
          <p className="mt-2 text-sm">Il Fantacalcio Classic a 20 squadre</p>
        </div>
        <div>
          <p className="section-eyebrow">Contatti</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold">
            <a href="mailto:ilfantaa20@gmail.com" className="group flex items-center gap-2.5 transition hover:text-blue-950">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] transition group-hover:text-sky-600">
                <path d="M3.75 5.75h16.5v12.5H3.75z" />
                <path d="m4.5 7 7.5 5.75L19.5 7" />
              </svg>
              <span>ilfantaa20@gmail.com</span>
            </a>
            <a href="https://www.instagram.com/ilfantaa20/" target="_blank" rel="noreferrer" className="group flex items-center gap-2.5 transition hover:text-blue-950">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] transition group-hover:text-sky-600">
                <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5" />
                <circle cx="12" cy="12" r="3.75" />
                <circle cx="17.5" cy="6.5" r=".75" className="fill-current stroke-none" />
              </svg>
              <span>Il Fanta a 20</span>
            </a>
          </div>
        </div>
        <div>
          <p className="section-eyebrow">Collegamenti utili</p>
          <div className="mt-4 grid gap-2 text-sm font-semibold">
            <Link href="/regolamento" className="transition hover:text-blue-950">Regolamento</Link>
            <Link href="/lista-attesa" className="transition hover:text-blue-950">Lista di Attesa</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
