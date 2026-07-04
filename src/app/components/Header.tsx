import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/logo.png"
            alt="Fanta a 20"
            width={50}
            height={50}
            className="h-10 w-auto"
          />

          <span className="font-bold text-blue-900 text-xl">
            IL FANTA A 20
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-slate-700 font-medium">
          <Link href="/" className="hover:text-blue-900">
            Home
          </Link>

          <Link href="/societa" className="hover:text-blue-900">
            Società
          </Link>

          <div className="relative group">
            <button className="hover:text-blue-900">
              Statistiche
            </button>

            <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-slate-200 shadow-lg rounded-xl p-3 min-w-44 z-50">
              <Link href="/ranking" className="block px-3 py-2 hover:text-blue-900">
                Ranking
              </Link>
              <Link href="/hall-of-fame" className="block px-3 py-2 hover:text-blue-900">
                Hall of Fame
              </Link>
            </div>
          </div>

          <div className="relative group">
            <button className="hover:text-blue-900">
              Competizioni
            </button>

            <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-slate-200 shadow-lg rounded-xl p-3 min-w-48 z-50">
              <Link href="/campionati" className="block px-3 py-2 hover:text-blue-900">
                Campionati
              </Link>
              <Link href="/coppe" className="block px-3 py-2 hover:text-blue-900">
                Coppe
              </Link>
              <Link href="/finali-storiche" className="block px-3 py-2 hover:text-blue-900">
                Finali Storiche
              </Link>
            </div>
          </div>

          <Link href="/regolamento" className="hover:text-blue-900">
            Regolamento
          </Link>
        </nav>
      </div>
    </header>
  );
}