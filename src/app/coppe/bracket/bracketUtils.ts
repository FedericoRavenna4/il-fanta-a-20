import type { PartitaCoppaFanta } from "@/lib/tabelloneCoppaFanta";
import { CARD_H, HEADER_H, PITCH } from "./bracketConfig";

export function norm(value: string) {
  return value.toLowerCase().replace(/\s/g, "");
}

export function sameRound(value: string, round: string) {
  const a = norm(value);
  const b = norm(round);

  if (b === "semifinali") {
    return a === "semifinale" || a === "semifinali";
  }

  return a === b;
}

export function numeroGara(gara: string) {
  return Number(gara.replace(/\D/g, "")) || 0;
}

export function getRoundMatches(
  partite: PartitaCoppaFanta[],
  roundKey: string
) {
  return partite
    .filter((p) => sameRound(p.turno, roundKey))
    .sort((a, b) => numeroGara(a.gara) - numeroGara(b.gara));
}

export function buildPositions(roundMatches: PartitaCoppaFanta[][]) {
  const centers: number[][] = [];

  roundMatches.forEach((matches, roundIndex) => {
    if (roundIndex === 0) {
      centers[roundIndex] = matches.map(
        (_, index) => HEADER_H + CARD_H / 2 + index * PITCH
      );
      return;
    }

    const prev = centers[roundIndex - 1] ?? [];
    const prevCount = prev.length;
    const currCount = matches.length;

    if (currCount === 0) {
      centers[roundIndex] = [];
      return;
    }

    if (currCount === prevCount) {
      centers[roundIndex] = matches.map(
        (_, index) => prev[index] ?? HEADER_H + CARD_H / 2
      );
      return;
    }

    if (prevCount === currCount * 2) {
      centers[roundIndex] = matches.map((_, index) => {
        const a = prev[index * 2];
        const b = prev[index * 2 + 1];
        return (a + b) / 2;
      });
      return;
    }

    centers[roundIndex] = matches.map(
      (_, index) => HEADER_H + CARD_H / 2 + index * PITCH
    );
  });

  return centers;
}

export function winnerLabel(gara: string, slot: 1 | 2) {
  const g = Number(gara.replace(/\D/g, ""));

  if (g >= 9 && g <= 12) {
    return `WG${(g - 9) * 2 + slot}`;
  }

  if (g >= 13 && g <= 28) {
    return `WG${g - 4}`;
  }

  if (g === 29) return slot === 1 ? "WG25" : "WG26";
  if (g === 30) return slot === 1 ? "WG27" : "WG28";
  if (g === 31) return slot === 1 ? "WG29" : "WG30";

  return `WG${g}`;
}

export function displaySlot(
  value: number | null,
  gara: string,
  slot: 1 | 2
) {
  return value ? `${value}°` : winnerLabel(gara, slot);
}