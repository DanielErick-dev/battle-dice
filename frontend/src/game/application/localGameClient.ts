import type { GameCommand } from "../domain/commands";
import { applyCommand, type GameDependencies } from "../domain/engine";
import type { GameState } from "../domain/types";
import type { GameClient, GameUpdateListener } from "./gameClient";

export class LocalGameClient implements GameClient {
  private readonly listeners = new Set<GameUpdateListener>();

  constructor(
    private state: GameState,
    private readonly deps: GameDependencies,
  ) {}

  getState(): GameState {
    return this.state;
  }

  async send(command: GameCommand): Promise<void> {
    const { state, events } = applyCommand(this.state, command, this.deps);
    this.state = state;
    this.listeners.forEach((listener) => listener({ state, events }));
  }

  subscribe(listener: GameUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
