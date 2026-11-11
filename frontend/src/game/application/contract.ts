// Entry point for `npm run schema`: the types listed in scripts/contract/generate-schema.mjs are read from here.
import type { GameUpdate, Snapshot } from "./gameClient";
import type {
  ClosedMessage,
  CommandResultMessage,
  HostMessage,
  JoinRefusedMessage,
  PresenceMessage,
  SnapshotWireMessage,
  UpdateWireMessage,
} from "./party/protocol";

export type { GameCommand } from "../domain/core/commands";
export type { GameErrorCode } from "../domain/core/errors";
export type { CommandResult } from "./gameClient";

/** GameState and GameEvent go through the server untouched, so the schema only promises a JSON object. */
export type OpaqueJson = { [key: string]: unknown };

interface Sequenced {
  /** @asType integer */
  seq: number;
}

export type SnapshotMessage = Omit<Snapshot, "seq" | "state"> & Sequenced & { state: OpaqueJson };

export type GameUpdateMessage = Omit<GameUpdate, "seq" | "state" | "events"> &
  Sequenced & {
    state: OpaqueJson;
    events: OpaqueJson[];
  };

// Party mode wire protocol (party/protocol.ts), with the same opaque state and events.
export type { ControllerMessage, HostErrorCode, JoinRefusal } from "./party/protocol";

export type PartySnapshotMessage = Omit<SnapshotWireMessage, "state"> & { state: OpaqueJson };
export type PartyUpdateMessage = Omit<UpdateWireMessage, "state" | "events"> & {
  state: OpaqueJson;
  events: OpaqueJson[];
};
export type PartyHostMessage =
  | PartySnapshotMessage
  | JoinRefusedMessage
  | PartyUpdateMessage
  | CommandResultMessage
  | PresenceMessage
  | ClosedMessage;

// Fails to compile if a host message is added to the protocol but not listed above.
type Assert<T extends true> = T;
export type PartyHostMessageIsComplete = Assert<
  [HostMessage["type"]] extends [PartyHostMessage["type"]] ? true : false
>;
