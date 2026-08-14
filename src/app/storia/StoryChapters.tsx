"use client";

import { useId, useState, type ReactNode } from "react";

type StoryChapterProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

function StoryChapter({ eyebrow, title, children }: StoryChapterProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[1.8rem] border border-sky-100 bg-white/90 text-blue-950 shadow-[0_18px_45px_-34px_rgba(15,23,42,.45)]">
      <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-sky-200/45 blur-3xl" />
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={`${expanded ? "Riduci" : "Espandi"} sezione ${title}`}
        onClick={() => setExpanded((current) => !current)}
        className="group relative flex min-h-28 w-full min-w-0 items-center justify-between gap-4 rounded-[1.8rem] p-5 text-left outline-none transition-colors hover:bg-sky-50/45 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none sm:min-h-32 sm:p-7"
      >
        <span className="min-w-0">
          <span className="block text-[9px] font-black uppercase tracking-[.2em] text-amber-600">{eyebrow}</span>
          <span className="mt-2.5 block max-w-full break-words text-[clamp(1.25rem,6vw,1.75rem)] font-black uppercase leading-[1.08] tracking-[-.02em] sm:mt-3 sm:text-3xl">
            {title}
          </span>
        </span>
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-sky-200 bg-white text-xl font-semibold text-blue-900 shadow-sm transition-transform duration-300 group-hover:border-sky-300 motion-reduce:transition-none">
          {expanded ? "−" : "+"}
        </span>
      </button>
      <div
        id={contentId}
        aria-hidden={!expanded}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 px-5 pb-6 text-sm font-semibold leading-7 text-slate-600 sm:px-7 sm:pb-8 sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StoryChapters() {
  return (
    <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
      <StoryChapter eyebrow="Dove tutto ha inizio" title="DAL 2023">
        <p>Nel 2023 il Fanta a 20 nasce tra amici, dalla voglia di spingere il fantacalcio Classic oltre i soliti confini: <strong className="font-black text-blue-950">venti partecipanti, venti rose e nessun calciatore doppione</strong>.</p>
        <p>Doveva essere una follia per una stagione. Invece, giornata dopo giornata, abbiamo iniziato a raccontarla, conservarne i risultati e darle una memoria. <strong className="font-black text-blue-950">È da lì che comincia la nostra storia.</strong></p>
      </StoryChapter>
      <StoryChapter eyebrow="DA UNA LEGA A UN PROGETTO" title="LA STORIA PRENDE FORMA">
        <p>Con il tempo una sola lega non basta più. Il Fanta a 20 si allarga, nascono nuove categorie e nuove competizioni, mentre promozioni, retrocessioni, trofei e rivalità iniziano a legare una stagione alla successiva.</p>
        <p><strong className="font-black text-blue-950">Il gioco continua, ma ciò che accade comincia a restare.</strong></p>
      </StoryChapter>
      <StoryChapter eyebrow="Cento Società. Un solo mondo." title="OGGI, IN 100">
        <p>Oggi il Fanta a 20 riunisce <strong className="font-black text-blue-950">100 Società in cinque leghe</strong>, ognuna con una storia da costruire e raccontare.</p>
        <p><strong className="font-black text-blue-950">Ranking Storico, Hall of Fame, Emblemi, competizioni e storie delle Società</strong> trovano spazio nel sito ufficiale: il luogo in cui tutto ciò che accade nel Fanta a 20 viene raccolto, conservato e può finalmente essere esplorato.</p>
      </StoryChapter>
    </div>
  );
}
