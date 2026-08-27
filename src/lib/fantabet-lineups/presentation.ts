import type { PublicLineup } from "./types";

const ROLE_RANK: Record<string, number> = { P: 0, D: 1, C: 2, A: 3 };

export function sortLineupPlayers(players: PublicLineup["players"]) {
  return players.map((player, index) => ({ player, index }))
    .sort((left, right) => (ROLE_RANK[left.player.role.trim().toUpperCase()] ?? 4) - (ROLE_RANK[right.player.role.trim().toUpperCase()] ?? 4) || left.index - right.index)
    .map(({ player }) => player);
}
