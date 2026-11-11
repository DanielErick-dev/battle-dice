import type { GameCommand } from "../domain/core/commands";
import { applyCommand, type GameTransition } from "../domain/core/engine";
import { GameRuleError } from "../domain/core/errors";
import type { PlayerId } from "../domain/core/ids";
import { projectEvents, projectState } from "../domain/core/projection";
import type { GameState } from "../domain/types";
import type { CommandResult, GameClient, GameUpdate, GameUpdateListener, Snapshot } from "./gameClient";

type Resolve = (state: GameState, command: GameCommand) => GameTransition;

/** Runs the rules in the browser: one hot-seat match, everyone at this screen. */
export class LocalGameClient implements GameClient {
  private readonly listeners = new Set<GameUpdateListener>();
  private seq = 0;

  /**
   * `resolve` is swapped only by tests that need loaded dice. A `localPlayerId` pins this screen to one seat
   * and sends only what that seat may see, as a server would; null (hot-seat) sends the full state.
   */
  constructor(
    private state: GameState,
    private readonly resolve: Resolve = applyCommand,
    private readonly localPlayerId: PlayerId | null = null,
  ) {}

  async connect(): Promise<Snapshot> {
    return { seq: this.seq, state: this.visible(this.state), localPlayerId: this.localPlayerId };
  }

  async send(command: GameCommand): Promise<CommandResult> {
    let transition: GameTransition;
    try {
      transition = this.resolve(this.state, command);
    } catch (error) {
      if (error instanceof GameRuleError) return { ok: false, code: error.code };
      throw error;
    }
    this.state = transition.state;
    this.seq += 1;
    const update: GameUpdate = {
      seq: this.seq,
      state: this.visible(transition.state),
      events: this.localPlayerId === null ? transition.events : projectEvents(transition.events, this.localPlayerId),
    };
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

  private visible(state: GameState): GameState {
    return this.localPlayerId === null ? state : projectState(state, this.localPlayerId);
  }
}
