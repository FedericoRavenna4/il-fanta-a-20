import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/55">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 text-slate-500 sm:grid-cols-[1fr_auto] sm:px-6 sm:py-11">
        <div>
          <p className="font-black text-blue-950">© Il Fanta a 20</p>
          <p className="mt-2 text-sm">Il Fantacalcio Classic a 20 squadre</p>
        </div>
        <div>
          <p className="section-eyebrow">Contatti</p>
          <div className="mt-4 grid gap-2 text-sm font-semibold sm:grid-cols-2 sm:gap-x-8">
            <a href="mailto:ilfantaa20@gmail.com" className="transition hover:text-blue-950">Email · ilfantaa20@gmail.com</a>
            <a href="https://www.instagram.com/ilfantaa20/" target="_blank" rel="noreferrer" className="transition hover:text-blue-950">Instagram · Il Fanta a 20</a>
            <Link href="/lista-attesa" className="transition hover:text-blue-950">Lista di Attesa</Link>
            <Link href="/regolamento" className="transition hover:text-blue-950">Regolamento</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
