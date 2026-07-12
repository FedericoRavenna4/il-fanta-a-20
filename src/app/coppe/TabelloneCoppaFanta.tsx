import type { PartitaCoppaFanta } from "@/lib/tabelloneCoppaFanta";
import BracketFinal from "./bracket/BracketFinal";
import BracketLegend from "./bracket/BracketLegend";
import BracketSide from "./bracket/BracketSide";

export default function TabelloneCoppaFanta({
  partite,
  stagione = "2025/26",
}: {
  partite: PartitaCoppaFanta[];
  stagione?: string;
}) {
  const partiteStagione = partite.filter((p) => p.stagione === stagione);
  const sinistra = partiteStagione.filter((p) => p.lato === "SX");
  const destra = partiteStagione.filter((p) => p.lato === "DX");

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">
          Tabellone finale
        </p>

        <h3 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:text-4xl">
          La strada verso la Coppa
        </h3>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-amber-300/60 bg-[#101a30] shadow-xl shadow-amber-200/40">
        <p className="border-b border-white/10 bg-[#1b3054] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/60 sm:hidden">Scorri lateralmente per esplorare il tabellone</p>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <div className="min-w-max bg-[radial-gradient(ellipse_at_center,#466eb3_0%,#375895_28%,#2a436f_55%,#1b2d4f_78%,#101a30_100%)] p-7 pb-5">
            <div className="flex items-center justify-center gap-4">
              <BracketSide partite={sinistra} side="SX" />

              <BracketFinal />

              <BracketSide partite={destra} side="DX" />
            </div>
          </div>
        </div>
<div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="border-t border-white/10 bg-[#1b3054] px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
          <BracketLegend />
        </div>
      </div>
    </div>
  );
}
