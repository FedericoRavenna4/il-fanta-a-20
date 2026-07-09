import { CARD_W } from "./bracketConfig";

const LINE =
  "bg-gradient-to-r from-transparent via-amber-300/80 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.55)]";

export default function BracketLines({
  side,
  roundIndex,
  currCenters,
  nextCenters,
  xCurrent,
  xNext,
}: {
  side: "SX" | "DX";
  roundIndex: number;
  currCenters: number[];
  nextCenters: number[];
  xCurrent: number;
  xNext: number;
}) {
  const currCount = currCenters.length;
  const nextCount = nextCenters.length;

  if (currCount === 0 || nextCount === 0) return null;

  const midX = side === "SX" ? xCurrent + 12 : xCurrent - 12;

  if (currCount === nextCount) {
    return (
      <>
        {currCenters.map((y, index) => {
          const targetY = nextCenters[index];

          return (
            <div key={`${side}-line-${roundIndex}-${index}`}>
              <div
                className={`absolute h-[2px] rounded-full ${LINE}`}
                style={{
                  top: y,
                  left: side === "SX" ? xCurrent : xNext,
                  width: Math.abs(xNext - xCurrent),
                }}
              />

              {targetY !== y && (
                <div
                  className="absolute w-[2px] rounded-full bg-gradient-to-b from-transparent via-amber-300/80 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.55)]"
                  style={{
                    top: Math.min(y, targetY),
                    left: midX,
                    height: Math.abs(targetY - y),
                  }}
                />
              )}
            </div>
          );
        })}
      </>
    );
  }

  if (currCount === nextCount * 2) {
    return (
      <>
        {nextCenters.map((nextY, index) => {
          const y1 = currCenters[index * 2];
          const y2 = currCenters[index * 2 + 1];

          return (
            <div key={`${side}-bracket-${roundIndex}-${index}`}>
              <div
                className={`absolute h-[2px] rounded-full ${LINE}`}
                style={{
                  top: y1,
                  left: side === "SX" ? xCurrent : midX,
                  width: 12,
                }}
              />

              <div
                className={`absolute h-[2px] rounded-full ${LINE}`}
                style={{
                  top: y2,
                  left: side === "SX" ? xCurrent : midX,
                  width: 12,
                }}
              />

              <div
                className="absolute w-[2px] rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                style={{
                  top: y1,
                  left: midX,
                  height: y2 - y1,
                }}
              />

              <div
                className={`absolute h-[2px] rounded-full ${LINE}`}
                style={{
                  top: nextY,
                  left: side === "SX" ? midX : xNext,
                  width: Math.abs(xNext - midX),
                }}
              />
            </div>
          );
        })}
      </>
    );
  }

  return null;
}