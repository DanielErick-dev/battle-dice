import type { GameCommand } from "../domain/core/commands";
import { applyCommand, type GameTransition } from "../domain/core/engine";
import { GameRuleError } from "../domain/core/errors";
import type { GameState } from "../domain/types";
import type { CommandResult, GameClient, GameUpdate, GameUpdateListener, Snapshot } from "./gameClient";

type Resolve = (state: GameState, command: GameCommand) => GameTransition;

/** Runs the rules in the browser: one hot-seat match, everyone at this screen. */
export class LocalGameClient implements GameClient {
  private readonly listeners = new Set<GameUpdateListener>();
  private seq = 0;

  /** `resolve` is swapped only by tests that need loaded dice. */
  constructor(
    private state: GameState,
    private readonly resolve: Resolve = applyCommand,
  ) {}

  async connect(): Promise<Snapshot> {
    return { seq: this.seq, state: this.state, localPlayerId: null };
  }

  async send(command: GameCommand): Promise<CommandResult> {
    let update: GameUpdate;
    try {
      const { state, events } = this.resolve(this.state, command);
      update = { seq: this.seq + 1, state, events };
    } catch (error) {
      if (error instanceof GameRuleError) return { ok: false, code: error.code };
      throw error;
    }
    this.state = update.state;
    this.seq = update.seq;
    this.listeners.forEach((listener) => listener(update));
    return { ok: true };
  }

  subscribe(listener: GameUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
  }
}
