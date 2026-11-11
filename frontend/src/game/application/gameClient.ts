import type { GameCommand } from "../domain/core/commands";
import type { GameErrorCode } from "../domain/core/errors";
import type { GameEvent } from "../domain/core/events";
import type { PlayerId } from "../domain/core/ids";
import type { GameState } from "../domain/types";

/** The full state on (re)joining: `seq` says which updates it already includes. */
export interface Snapshot {
  seq: number;
  state: GameState;
  /** The seat this screen plays; null = hot-seat, whoever must act plays here. */
  localPlayerId: PlayerId | null;
}

/** One accepted command; `seq` grows by one each time, so a late or repeated update can be spotted. */
export interface GameUpdate {
  seq: number;
  state: GameState;
  events: readonly GameEvent[];
}

/** Plain data, not an Error subclass: it has to survive a JSON trip from the server. */
export type CommandResult = { ok: true } | { ok: false; code: GameErrorCode };

export type GameUpdateListener = (update: GameUpdate) => void;

/** Port to whoever is authoritative: LocalGameClient today, a WebSocket room client later, same contract. */
export interface GameClient {
  connect(): Promise<Snapshot>;
  /** A rule refusal resolves as `{ ok: false }`; only a transport failure rejects. */
  send(command: GameCommand): Promise<CommandResult>;
  subscribe(listener: GameUpdateListener): () => void;
  close(): void;
}
