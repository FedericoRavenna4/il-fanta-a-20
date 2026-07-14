import {
  GAME_SCENARIOS,
  SCENARIO_DURATION_SECONDS,
  SCENARIO_TRANSITION_SECONDS,
} from "./config";

export function getScenarioState(elapsed: number) {
  const absoluteIndex = Math.floor(elapsed / SCENARIO_DURATION_SECONDS);
  const index = absoluteIndex % GAME_SCENARIOS.length;
  const previousIndex = (index - 1 + GAME_SCENARIOS.length) % GAME_SCENARIOS.length;
  const withinScenario = elapsed % SCENARIO_DURATION_SECONDS;

  return {
    current: GAME_SCENARIOS[index],
    previous: GAME_SCENARIOS[previousIndex],
    cycle: Math.floor(absoluteIndex / GAME_SCENARIOS.length) + 1,
    transition:
      absoluteIndex === 0
        ? 1
        : Math.min(1, withinScenario / SCENARIO_TRANSITION_SECONDS),
  };
}
