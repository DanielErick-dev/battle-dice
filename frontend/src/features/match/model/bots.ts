import { botMove } from "@/game/domain/bots/simpleBot";
import type { GameCommand } from "@/game/domain/core/commands";
import type { PlayerId } from "@/game/domain/core/ids";
import type { GameState } from "@/game/domain/types";
import type { MatchStore } from "./matchStore";

/** How long a computer player "thinks" before each move, once the last one has played out. */
const BOT_THINK_MS = 700;

/** Lets the computer players move whenever the screen is idle and it's up to one of them; returns a stop. */
export function driveBots(
  store: MatchStore,
  current: () => GameState,
  send: (command: GameCommand) => Promise<unknown>,
  botIds: readonly PlayerId[],
): () => void {
  if (botIds.length === 0) return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const think = () => {
    const view = store.getSnapshot();
    if (!view || view.isAnimating || timer !== null) return;
    const state = current();
    const move = botIds.map((id) => botMove(state, id)).find((command) => command !== null);
    if (!move) return;
    timer = setTimeout(() => {
      timer = null;
      void send(move).then(think);
    }, BOT_THINK_MS);
  };
  const unsubscribe = store.subscribe(think);
  think();
  return () => {
    if (timer !== null) clearTimeout(timer);
    unsubscribe();
  };
}
