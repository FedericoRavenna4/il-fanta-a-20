import type { PartitaCoppaFanta } from "@/lib/tabelloneCoppaFanta";
import {
  CARD_H,
  CARD_W,
  COL_W,
  HEADER_H,
  PITCH,
  rounds,
} from "./bracketConfig";
import {
  buildPositions,
  getRoundMatches,
} from "./bracketUtils";
import BracketLines from "./BracketLines";
import MatchCard from "./MatchCard";

export default function BracketSide({
  partite,
  side,
}: {
  partite: PartitaCoppaFanta[];
  side: "SX" | "DX";
}) {
  const roundMatches = rounds.map((round) =>
    getRoundMatches(partite, round.key)
  );

  const centers = buildPositions(roundMatches);

  const baseCount = Math.max(roundMatches[0]?.length ?? 0, 8);
  const height = HEADER_H + baseCount * PITCH + 20;
  const width = rounds.length * COL_W;

  function xForRound(roundIndex: number) {
    return side === "SX"
      ? roundIndex * COL_W
      : (rounds.length - 1 - roundIndex) * COL_W;
  }

  return (
    <div className="relative shrink-0" style={{ width, height }}>
      {rounds.map((round, roundIndex) => {
        const visualX = xForRound(roundIndex);
        const matches = roundMatches[roundIndex];

        return (
          <div
            key={`${side}-${round.key}`}
            className="absolute top-0"
            style={{ left: visualX, width: CARD_W }}
          >
            <div className="flex h-[42px] flex-col items-center justify-center">
  <p className="text-[15px] font-black uppercase tracking-[0.22em] text-amber-300">
    {round.label}
  </p>

  <div className="mt-2 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
</div>

            {matches.map((partita, matchIndex) => {
              const center = centers[roundIndex][matchIndex];

              return (
                <div
                  key={`${partita.lato}-${partita.turno}-${partita.gara}`}
                  className="absolute"
                  style={{
                    top: center - CARD_H / 2,
                    left: 0,
                  }}
                >
                  <MatchCard partita={partita} />
                </div>
              );
            })}
          </div>
        );
      })}

      {rounds.slice(0, -1).map((_, roundIndex) => {
        const currCenters = centers[roundIndex] ?? [];
        const nextCenters = centers[roundIndex + 1] ?? [];

        if (currCenters.length === 0 || nextCenters.length === 0) return null;

        const xCurrent =
          side === "SX" ? xForRound(roundIndex) + CARD_W : xForRound(roundIndex);

        const xNext =
          side === "SX"
            ? xForRound(roundIndex + 1)
            : xForRound(roundIndex + 1) + CARD_W;

        return (
          <BracketLines
            key={`${side}-lines-${roundIndex}`}
            side={side}
            roundIndex={roundIndex}
            currCenters={currCenters}
            nextCenters={nextCenters}
            xCurrent={xCurrent}
            xNext={xNext}
          />
        );
      })}
    </div>
  );
}