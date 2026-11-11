// Wire protocol between the match host (TV tab today, FastAPI room later) and each controller. Types only.
import type { GameCommand } from "../../domain/core/commands";
import type { GameErrorCode } from "../../domain/core/errors";
import type { GameEvent } from "../../domain/core/events";
import type { PlayerId } from "../../domain/core/ids";
import type { GameState } from "../../domain/types";

/** Refusals decided by the host before the rules run; never reach the domain. */
export type HostErrorCode = "NOT_SEATED" | "NOT_YOUR_SEAT" | "RESTART_NOT_ALLOWED";

export type JoinRefusal = "ROOM_FULL" | "SEAT_TAKEN" | "UNKNOWN_SEAT";

export type WireCommandResult = { ok: true } | { ok: false; code: GameErrorCode | HostErrorCode };

// ---- controller → host. `clientId` is stable per screen (kept across reloads) so a seat can be reclaimed.

export interface JoinMessage {
  type: "join";
  clientId: string;
  /** "spectator" sees no secrets and sends no commands (the TV, or a phone still picking a seat). */
  role: "player" | "spectator";
  /** Omitted: the seat this client already holds, else the first free one. */
  seat?: PlayerId;
  /** Shown to the table in presence. */
  name?: string;
  /** The character the player wants; only a hint for a future pre-game lobby, the seats are fixed today. */
  character?: string;
}

export interface CommandMessage {
  type: "command";
  clientId: string;
  /**
   * Echoed in the result so the controller can match it to its pending send.
   * @asType integer
   */
  requestId: number;
  command: GameCommand;
}

export interface ResyncMessage {
  type: "resync";
  clientId: string;
  /**
   * The last seq this controller applied; the host replays what follows or sends a fresh snapshot.
   * @asType integer
   */
  sinceSeq: number;
}

export interface LeaveMessage {
  type: "leave";
  clientId: string;
}

export type ControllerMessage = JoinMessage | CommandMessage | ResyncMessage | LeaveMessage;

// ---- host → controller. `to` names the receiving clientId (a shared channel delivers to everyone).

/** Sent on join and when a resync can't be replayed; the same shape as the GameClient Snapshot. */
export interface SnapshotWireMessage {
  type: "snapshot";
  to: string;
  /** @asType integer */
  seq: number;
  /** Already projected for this client's seat. */
  state: GameState;
  /** null = spectator. */
  localPlayerId: PlayerId | null;
}

export interface JoinRefusedMessage {
  type: "joinRefused";
  to: string;
  reason: JoinRefusal;
}

export interface UpdateWireMessage {
  type: "update";
  to: string;
  /** @asType integer */
  seq: number;
  state: GameState;
  events: GameEvent[];
}

export interface CommandResultMessage {
  type: "commandResult";
  to: string;
  /** @asType integer */
  requestId: number;
  result: WireCommandResult;
}

export interface SeatPresence {
  playerId: PlayerId;
  /** The in-game player name. */
  playerName: string;
  /** Who holds the seat (their join name), null while free. */
  controllerName: string | null;
  /** Hint sent by the controller holding the seat. */
  character: string | null;
}

/** Sent to every client whenever someone joins or leaves. */
export interface PresenceMessage {
  type: "presence";
  to: string;
  seats: SeatPresence[];
  /** @asType integer */
  spectators: number;
}

export interface ClosedMessage {
  type: "closed";
  to: string;
  /** HOST_CLOSED: the match ended for everyone; SEAT_RELEASED: the host freed this client's seat. */
  reason: "HOST_CLOSED" | "SEAT_RELEASED";
}

export type HostMessage =
  SnapshotWireMessage | JoinRefusedMessage | UpdateWireMessage | CommandResultMessage | PresenceMessage | ClosedMessage;
