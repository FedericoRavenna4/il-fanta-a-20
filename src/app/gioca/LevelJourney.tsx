import { LEVEL_RULES, type ClubProgress, type GameLevel } from "@/lib/game/progression";

export default function LevelJourney({ progress }: { progress: ClubProgress }) {
  return (
    <section className="relative mx-auto mt-3 w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.045] p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:mt-4 sm:p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-amber-300">Percorso della società</p>
        <span className="rounded-full border border-sky-200/20 bg-sky-300/10 px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-sky-100">
          Livello {progress.currentLevel}
        </span>
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-3">
        {([1, 2, 3] as GameLevel[]).map((level) => {
          const rule = LEVEL_RULES[level];
          const active = progress.currentLevel === level;
          return (
            <article
              key={level}
              className={`rounded-lg border px-2.5 py-2 ${active ? "border-amber-200/35 bg-amber-300/10" : "border-white/[.07] bg-slate-950/22"}`}
            >
              <p className={`text-[7px] font-black uppercase tracking-[.14em] ${active ? "text-amber-300" : "text-white/38"}`}>
                Livello {level}
              </p>
              <h4 className="mt-0.5 text-[9px] font-black uppercase leading-tight text-white">{rule.name}</h4>
              <p className="mt-0.5 text-[8px] font-semibold leading-3 text-white/52">{rule.objective}</p>
              {progress.bestDistanceByLevel[level] > 0 && (
                <p className="mt-1 text-[7px] font-bold text-sky-100/55">
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
