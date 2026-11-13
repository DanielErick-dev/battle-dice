import type { GameState } from "../../domain/types";
import { MatchHost, type MatchHostOptions } from "./matchHost";
import { type JoinRequest, RemoteGameClient, type RemoteGameClientOptions } from "./remoteGameClient";
import { type ControllerTransport, controllerChannel, type HostTransport, hostChannel } from "./transport";
import { WebSocketTransport } from "./webSocketTransport";

export * from "./matchHost";
export * from "./remoteGameClient";
export * from "./transport";
export * from "./webSocketTransport";
export type * from "./protocol";

/** Room server base URL, or null for the same-browser BroadcastChannel; "auto" = the dev relay on this page's host. */
function relayUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (!configured) return null;
  if (configured !== "auto") return configured;
  // Read lazily in the browser: the relay sits next to whatever host the page was opened from.
  const host = (globalThis as { location?: Location }).location?.hostname;
  return host ? `ws://${host}:3002` : null;
}

const roomUrl = (base: string, room: string, side: "host" | "controle") =>
  `${base}/salas/${encodeURIComponent(room.trim().toUpperCase())}?lado=${side}`;

const hostTransport = (room: string): HostTransport => {
  const base = relayUrl();
  return base ? new WebSocketTransport(roomUrl(base, room, "host")) : hostChannel(room);
};

const controllerTransport = (room: string): ControllerTransport => {
  const base = relayUrl();
  return base ? new WebSocketTransport(roomUrl(base, room, "controle")) : controllerChannel(room);
};

/** Hosts `state` for the room: on the relay when NEXT_PUBLIC_WS_URL is set, else on the BroadcastChannel. */
export const hostPartyOnChannel = (room: string, state: GameState, options?: MatchHostOptions): MatchHost =>
  new MatchHost(state, hostTransport(room), options);

/** A GameClient for a phone (role "player") or the TV (role "spectator"), on the same transport as the host. */
export const joinPartyOnChannel = (
  room: string,
  request: JoinRequest,
  options?: RemoteGameClientOptions,
): RemoteGameClient => new RemoteGameClient(() => controllerTransport(room), request, options);
