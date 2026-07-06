import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/logo.png"
            alt="Fanta a 20"
            width={48}
            height={48}
            className="h-11 w-auto"
          />

          <span className="font-extrabold tracking-tight text-blue-950 text-lg">
            IL FANTA A 20
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600 font-semibold">
          <Link href="/" className="hover:text-blue-950">
            Home
          </Link>

          <Link href="/societa" className="hover:text-blue-950">
            Società
          </Link>

          <div className="relative group">
            <button className="hover:text-blue-950">Statistiche</button>

            <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-slate-200 shadow-xl rounded-2xl p-3 min-w-44">
              <Link href="/ranking" className="block px-3 py-2 rounded-xl hover:bg-slate-50">
                Ranking
              </Link>
              <Link href="/hall-of-fame" className="block px-3 py-2 rounded-xl hover:bg-slate-50">
                Hall of Fame
              </Link>
            </div>
          </div>

          <div className="relative group">
            <button className="hover:text-blue-950">Competizioni</button>

            <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-slate-200 shadow-xl rounded-2xl p-3 min-w-48">
              <Link href="/campionati" className="block px-3 py-2 rounded-xl hover:bg-slate-50">
                Campionati
              </Link>
              <Link href="/coppe" className="block px-3 py-2 rounded-xl hover:bg-slate-50">
                Coppe
              </Link>
              <Link href="/finali-storiche" className="block px-3 py-2 rounded-xl hover:bg-slate-50">
                Finali Storiche
              </Link>
            </div>
          </div>

          <Link href="/regolamento" className="hover:text-blue-950">
            Regolamento
          </Link>
        </nav>
      </div>
    </header>
  );
}