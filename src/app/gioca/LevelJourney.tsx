import { LEVEL_RULES, type ClubProgress, type GameLevel } from "@/lib/game/progression";

export default function LevelJourney({ progress }: { progress: ClubProgress }) {
  return (
    <section className="relative mx-auto mt-2 w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.045] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:mt-4 sm:p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[7px] font-black uppercase tracking-[.14em] text-amber-300 sm:text-[8px] sm:tracking-[.18em]">Percorso della società</p>
        <span className="rounded-full border border-sky-200/20 bg-sky-300/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] text-sky-100 sm:px-2 sm:py-1 sm:text-[7px] sm:tracking-[.12em]">
          Livello {progress.currentLevel}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 sm:mt-2">
        {([1, 2, 3] as GameLevel[]).map((level) => {
          const rule = LEVEL_RULES[level];
          const active = progress.currentLevel === level;
          return (
            <article
              key={level}
              className={`rounded-lg border px-1.5 py-1.5 sm:px-2.5 sm:py-2 ${active ? "border-amber-200/35 bg-amber-300/10" : "border-white/[.07] bg-slate-950/22"}`}
            >
              <p className={`text-[6px] font-black uppercase tracking-[.1em] sm:text-[7px] sm:tracking-[.14em] ${active ? "text-amber-300" : "text-white/38"}`}>
                Livello {level}
              </p>
              <h4 className="mt-0.5 text-[8px] font-black uppercase leading-[10px] text-white sm:text-[9px] sm:leading-tight">{rule.name}</h4>
              <p className="mt-0.5 text-[7px] font-semibold leading-[9px] text-white/52 sm:text-[8px] sm:leading-3">{rule.objective}</p>
              {progress.bestDistanceByLevel[level] > 0 && (
                <p className="mt-0.5 text-[6px] font-bold leading-[8px] text-sky-100/55 sm:mt-1 sm:text-[7px] sm:leading-normal">
                  Record: {progress.bestDistanceByLevel[level].toLocaleString("it-IT")} m
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
