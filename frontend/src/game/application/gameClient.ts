import type { GameCommand } from "../domain/commands";
import type { GameEvent } from "../domain/events";
import type { GameState } from "../domain/types";

export interface GameUpdate {
  state: GameState;
  events: readonly GameEvent[];
}

export type GameUpdateListener = (update: GameUpdate) => void;

/**
 * Port between the UI and whoever is authoritative over the game.
 * Today: LocalGameClient (in-memory). Later: a WebSocket client talking to the
 * FastAPI room server, with the exact same contract.
 */
export interface GameClient {
  getState(): GameState;
  send(command: GameCommand): Promise<void>;
  subscribe(listener: GameUpdateListener): () => void;
}
