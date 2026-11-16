import { describe, it } from "vitest";
import { applyCommand, createGame } from "../core/engine";
import { POWER_TOURNAMENT_BOARD } from "../board/presets";
import { botMove } from "./simpleBot";
import type { AbilityId } from "../abilities/ability";
import type { GameState } from "../core/state";

// Off in the normal test run: `npm run balance` (MATCHES=300 PLAYERS=4 to change the sample).
const RUN = process.env.BALANCE === "1";
const MATCHES = Number(process.env.MATCHES ?? 200);
const PLAYERS = Number(process.env.PLAYERS ?? 4);
const MOVE_CAP = 6000;

const ABILITIES: readonly AbilityId[] = [
  "doubleCast",
  "theVoid",
  "fourElements",
  "fireZone",
  "seraphielBlessing",
  "cleansingTide",
  "untamed",
  "silentVerdict",
  "timeWarp",
  "empPulse",
  "levitation",
  "grandInversion",
  "dormantFury",
  "arrowRain",
  "cardGamble",
  "resurrection",
  "forbiddenSeals",
  "spectralApparitions",
  "fairyBloom",
  "ocularAwakening",
  "weeding",
];

/** PLAYERS different abilities for this match, drawn from a tiny seeded generator (mulberry32). */
function drawAbilities(match: number, count: number): AbilityId[] {
  let seed = 0x9e3779b9 ^ match;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = [...ABILITIES];
  return Array.from({ length: count }, () => pool.splice(Math.floor(next() * pool.length), 1)[0]!);
}

/** Bots only, on the Power Tournament: who wins how often, per ability (seat order shuffled by the seed). */
describe.runIf(RUN)("balance simulation", () => {
  it("prints each ability's win rate", { timeout: 30 * 60_000 }, () => {
    const played = new Map<AbilityId, number>();
    const won = new Map<AbilityId, number>();
    let unfinished = 0;
    for (let match = 0; match < MATCHES; match++) {
      const picks = drawAbilities(match, PLAYERS);
      const players = picks.map((ability, seat) => ({ id: `p${seat}`, name: ability, ability }));
      let state: GameState = createGame(POWER_TOURNAMENT_BOARD, players, { seed: 1000 + match });
      for (let move = 0; move < MOVE_CAP && state.status !== "finished"; move++) {
        const command = state.players.map((player) => botMove(state, player.id)).find((next) => next !== null);
        if (!command) break;
        state = applyCommand(state, command).state;
      }
      picks.forEach((ability) => played.set(ability, (played.get(ability) ?? 0) + 1));
      const winner = state.players.find((player) => player.id === state.winnerId);
      if (winner?.ability) won.set(winner.ability, (won.get(winner.ability) ?? 0) + 1);
      else unfinished += 1;
    }
    const table = [...played.entries()]
      .map(([ability, count]) => ({
        ability,
        matches: count,
        winRate: `${(((won.get(ability) ?? 0) / count) * 100).toFixed(1)}%`,
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
    console.table(table);
    console.log(
      `${MATCHES} partidas de ${PLAYERS}; esperado ~${(100 / PLAYERS).toFixed(1)}% cada; sem vencedor: ${unfinished}`,
    );
  });
});
