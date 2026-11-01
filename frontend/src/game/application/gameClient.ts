import type { GameCommand } from "../domain/core/commands";
import type { GameEvent } from "../domain/core/events";
import type { GameState } from "../domain/types";

export interface GameUpdate {
  state: GameState;
  events: readonly GameEvent[];
}

export type GameUpdateListener = (update: GameUpdate) => void;

/** Port to whoever is authoritative: LocalGameClient today, a WebSocket room client later, same contract. */
export interface GameClient {
  getState(): GameState;
  send(command: GameCommand): Promise<void>;
  subscribe(listener: GameUpdateListener): () => void;
}
