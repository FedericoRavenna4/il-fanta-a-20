import { rounds } from "./bracketConfig";

export default function BracketLegend() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="grid gap-3 text-xs font-bold text-white/70 md:grid-cols-3">
        <p>
          <span className="font-black text-amber-300">35°</span> = posizione nel
          girone di qualificazione
        </p>

        <p>
          <span className="font-black text-amber-300">WG1</span> = vincente della
          gara G1
        </p>

        <p>
          <span className="font-black text-amber-300">PO</span> = turno playoff
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {rounds.map((round) => (
          <div
            key={round.key}
            className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/70 ring-1 ring-white/10"
          >
            <span className="text-amber-300">{round.label}</span>
            <span className="mx-1 text-white/30">=</span>
            {round.full}
          </div>
        ))}
      </div>
    </div>
  );
}