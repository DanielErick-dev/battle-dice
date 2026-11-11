// Entry point for `npm run schema`: the types listed in scripts/contract/generate-schema.mjs are read from here.
import type { GameUpdate, Snapshot } from "./gameClient";

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
