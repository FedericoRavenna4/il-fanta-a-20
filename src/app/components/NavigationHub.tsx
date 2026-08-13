import Link from "next/link";

type HubItem = { href: string; title: string; description: string };

export default function NavigationHub({ title, eyebrow, items }: { title: string; eyebrow: string; items: HubItem[] }) {
  return <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
    <header className="mb-5 sm:mb-8">
      <p className="section-eyebrow">{eyebrow}</p>
      <h1 className="text-4xl font-black uppercase tracking-tight text-blue-950 sm:text-5xl">{title}</h1>
    </header>
    <nav aria-label={`Sezioni ${title}`} className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => <Link key={item.href} href={item.href} className="group relative isolate flex min-h-28 overflow-hidden rounded-[1.65rem] border border-white/20 bg-gradient-to-br from-blue-950 via-blue-900 to-sky-700 p-4 text-white shadow-[0_20px_45px_-28px_rgba(7,31,69,.85)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-25px_rgba(7,31,69,.7)] active:translate-y-0 active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:min-h-36 sm:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-sky-300/15 blur-3xl transition duration-300 group-hover:bg-sky-300/20" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 left-1/4 h-28 w-40 rounded-full bg-amber-300/10 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.12),transparent_42%)]" />
        <span className="relative flex min-w-0 flex-1 items-center">
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black uppercase leading-tight sm:text-xl">{item.title}</span>
            <span className="mt-1 block text-xs font-semibold leading-4 text-white/65 sm:text-sm sm:leading-5">{item.description}</span>
            <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/90">Apri <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
          </span>
        </span>
      </Link>)}
    </nav>
  </main>;
}
