import type { PartitaCoppaFanta } from "@/lib/tabelloneCoppaFanta";
import { CARD_H, CARD_W } from "./bracketConfig";
import { displaySlot, norm } from "./bracketUtils";

export default function MatchCard({
  partita,
}: {
  partita: PartitaCoppaFanta;
}) {
  const winner1 = norm(partita.vincitore) === norm(partita.squadra1);
  const winner2 = norm(partita.vincitore) === norm(partita.squadra2);

  return (
    <div
      className="overflow-hidden rounded-lg bg-white/95 shadow-md ring-1 ring-amber-200/60 transition hover:-translate-y-0.5 hover:shadow-amber-300/40"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="flex h-[10px] items-center justify-center bg-amber-300 text-[8px] font-black uppercase tracking-wide text-blue-950">
        {partita.gara}
      </div>

      <div className="grid h-[24px] grid-cols-2">
        <div
          className={`flex items-center justify-center border-r border-slate-100 ${
            winner1 ? "bg-amber-100 text-blue-950" : "bg-white text-slate-500"
          }`}
        >
          <span className="text-[10px] font-black">
            {displaySlot(partita.posizione1, partita.gara, 1)}
          </span>
        </div>

        <div
          className={`flex items-center justify-center ${
            winner2 ? "bg-amber-100 text-blue-950" : "bg-white text-slate-500"
          }`}
        >
          <span className="text-[10px] font-black">
            {displaySlot(partita.posizione2, partita.gara, 2)}
          </span>
        </div>
      </div>
    </div>
  );
}