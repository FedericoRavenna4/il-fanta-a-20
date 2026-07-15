"use client";

import Image from "next/image";
import { POWER_UP_CONFIG } from "@/lib/game/powerups";
import type { GameSnapshot, SpecialPresentation } from "@/lib/game/types";

export default function GameOverlayLayer({
  presentation,
  snapshot,
}: {
  presentation: SpecialPresentation | null;
  snapshot: GameSnapshot;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-live="polite">
      {presentation && (
        <div
          key={`${presentation.asset}-${presentation.title}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="special-presentation relative aspect-[3/2] w-[min(72%,270px)] sm:w-[min(62%,480px)]">
            <Image
              src={presentation.asset}
              alt={presentation.title}
              fill
              unoptimized
              sizes="(max-width: 639px) 260px, 460px"
              className="object-contain"
            />
          </div>
          <span className="sr-only">{presentation.subtitle}</span>
        </div>
      )}

      {!presentation && (
        <div className="absolute left-2 top-2 flex max-w-[72%] flex-col items-start gap-1.5 sm:left-3 sm:top-3">
          {snapshot.activePowerUps.map((powerUp) => {
            const definition = POWER_UP_CONFIG[powerUp.kind];
            return (
              <EffectTimer key={powerUp.kind} text={definition.name} seconds={powerUp.remaining} tone="power" asset={definition.asset} color={definition.hudColor} />
            );
          })}
          {snapshot.rafficaType && <EffectTimer tone={snapshot.rafficaType === "malus" ? "malus" : "bonus"} text={`Raffica ${snapshot.rafficaType}`} seconds={snapshot.rafficaRemaining} />}
          {snapshot.bossRemaining > 0 && <EffectTimer tone="malus" text="Boss 20" seconds={snapshot.bossRemaining} />}
        </div>
      )}

      <style jsx global>{`
        @keyframes special-presentation-in {
          0% { opacity: 0; transform: scale(.86); }
          7% { opacity: 1; transform: scale(1); }
          89% { opacity: 1; transform: scale(.985); }
          100% { opacity: 0; transform: translateY(-2%) scale(.96); }
        }
        .special-presentation {
          animation: special-presentation-in 5.6s cubic-bezier(.2,.8,.2,1) both;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) { .special-presentation { animation: none; } }
      `}</style>
    </div>
  );
}

function EffectTimer({ tone, text, seconds, asset, color }: { tone: "bonus" | "malus" | "power"; text: string; seconds: number; asset?: string; color?: string }) {
  const colors = tone === "malus"
    ? "border-rose-200/25 text-rose-50"
    : tone === "bonus"
      ? "border-amber-200/25 text-amber-50"
      : "border-sky-200/25 text-sky-50";
  return (
    <span className={`grid min-w-[126px] grid-cols-[auto_1fr] items-center gap-x-2 rounded-xl border bg-slate-950/88 px-3 py-2 text-white shadow-[0_8px_20px_rgba(2,8,23,.34),inset_0_1px_0_rgba(255,255,255,.06)] sm:min-w-[136px] sm:px-3 sm:py-2 ${colors}`}>
      {asset ? <Image src={asset} alt="" width={28} height={38} unoptimized className="row-span-2 h-9 w-6 object-contain sm:h-10 sm:w-7" /> : <span className="row-span-2 h-7 w-1 rounded-full bg-current opacity-75" />}
      <span className="truncate text-[8px] font-black uppercase leading-none tracking-[0.1em] sm:text-[9px]">{text}</span>
      <strong className="text-3xl font-black leading-none tabular-nums sm:text-3xl" style={color ? { color } : undefined}>{Math.ceil(seconds)}&quot;</strong>
    </span>
  );
}
