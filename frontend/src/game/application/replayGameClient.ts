import type { GameCommand } from "../domain/core/commands";
import { applyCommand } from "../domain/core/engine";
import type { GameState } from "../domain/types";
import type { CommandResult, GameClient, GameUpdateListener, Snapshot } from "./gameClient";

/** A whole match: the state it opened on and every accepted command, which the engine replays exactly. */
export interface MatchRecording {
  opening: GameState;
  commands: readonly GameCommand[];
}

/**
 * Plays a recorded match back one command per `step()`: a spectator's GameClient that takes no commands.
 * The state carries its own random stream, so each step comes out as it did the first time.
 */
export class ReplayGameClient implements GameClient {
  private readonly listeners = new Set<GameUpdateListener>();
  private state: GameState;
  private next = 0;

  constructor(private readonly recording: MatchRecording) {
    this.state = recording.opening;
  }

  get done(): boolean {
    return this.next >= this.recording.commands.length;
  }

  async connect(): Promise<Snapshot> {
    this.state = this.recording.opening;
    this.next = 0;
    return { seq: 0, state: this.state, localPlayerId: null };
  }

  async send(): Promise<CommandResult> {
    return { ok: false, code: "NOT_YOUR_TURN" };
  }

  /** Applies the next recorded command and broadcasts it; false once the match is over. */
  step(): boolean {
    const command = this.recording.commands[this.next];
    if (!command) return false;
    const transition = applyCommand(this.state, command);
    this.state = transition.state;
    this.next += 1;
    const update = { seq: this.next, state: transition.state, events: transition.events };
    this.listeners.forEach((listener) => listener(update));
    return true;
  }

  subscribe(listener: GameUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
  }
}
