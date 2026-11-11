import type { GameState } from "../../domain/types";
import { MatchHost, type MatchHostOptions } from "./matchHost";
import { type JoinRequest, RemoteGameClient, type RemoteGameClientOptions } from "./remoteGameClient";
import { controllerChannel, hostChannel } from "./transport";

export * from "./matchHost";
export * from "./remoteGameClient";
export * from "./transport";
export type * from "./protocol";

/** Same-browser party: hosts `state` on the room's BroadcastChannel. */
export const hostPartyOnChannel = (room: string, state: GameState, options?: MatchHostOptions): MatchHost =>
  new MatchHost(state, hostChannel(room), options);

/** Same-browser party: a GameClient for a phone (role "player") or the TV (role "spectator"). */
export const joinPartyOnChannel = (
  room: string,
  request: JoinRequest,
  options?: RemoteGameClientOptions,
): RemoteGameClient => new RemoteGameClient(() => controllerChannel(room), request, options);
