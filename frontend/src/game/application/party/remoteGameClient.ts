import type { GameCommand } from "../../domain/core/commands";
import type { PlayerId } from "../../domain/core/ids";
import type { CommandResult, GameClient, GameUpdateListener, Snapshot } from "../gameClient";
import type { HostErrorCode, HostMessage, JoinMessage, JoinRefusal, PresenceMessage } from "./protocol";
import type { ControllerTransport } from "./transport";

/** The host turned the join down; `reason` is the wire code. */
export class JoinRefusedError extends Error {
  constructor(readonly reason: JoinRefusal) {
    super(reason);
    this.name = "JoinRefusedError";
  }
}

/** A refusal from the host itself (wrong seat, spectator, restart): a screen bug, not a game rule. */
export class HostRefusedError extends Error {
  constructor(readonly code: HostErrorCode) {
    super(code);
    this.name = "HostRefusedError";
  }
}

export type JoinRequest = Omit<JoinMessage, "type">;

export interface RemoteGameClientOptions {
  /** How long connect and send wait for the host before rejecting. */
  timeoutMs?: number;
}

export type Presence = Omit<PresenceMessage, "type" | "to">;

const HOST_CODES: readonly string[] = ["NOT_SEATED", "NOT_YOUR_SEAT", "RESTART_NOT_ALLOWED"] satisfies HostErrorCode[];

function isHostErrorCode(code: string): code is HostErrorCode {
  return HOST_CODES.includes(code);
}

interface Pending {
  resolve: (result: CommandResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * GameClient over a Transport: a phone (seated) or the TV (spectator) talking to a MatchHost or a room server.
 * A new transport is opened on each connect, since MatchStore may close and reopen the same client.
 */
export class RemoteGameClient implements GameClient {
  private transport: ControllerTransport | null = null;
  private stopListening: (() => void) | null = null;
  private stopWatchingClose: (() => void) | null = null;
  private onConnectionLost: (() => void) | null = null;
  private readonly listeners = new Set<GameUpdateListener>();
  private readonly presenceListeners = new Set<(presence: Presence) => void>();
  private readonly pending = new Map<number, Pending>();
  private nextRequestId = 1;
  private lastSeq = -1;
  private seat: PlayerId | null = null;
  private joined = false;
  private latestPresence: Presence | null = null;
  private onClosedByHost: ((reason: "HOST_CLOSED" | "SEAT_RELEASED") => void) | null = null;
  private readonly timeoutMs: number;

  constructor(
    private readonly openTransport: () => ControllerTransport,
    private readonly request: JoinRequest,
    { timeoutMs = 8000 }: RemoteGameClientOptions = {},
  ) {
    this.timeoutMs = timeoutMs;
  }

  /** Null for a spectator or before joining. */
  get localPlayerId(): PlayerId | null {
    return this.seat;
  }

  get presence(): Presence | null {
    return this.latestPresence;
  }

  connect(): Promise<Snapshot> {
    this.detach();
    const transport = this.openTransport();
    this.transport = transport;
    return new Promise<Snapshot>((resolve, reject) => {
      const timer = setTimeout(() => fail(new Error("The host did not answer the join")), this.timeoutMs);
      const fail = (error: Error) => {
        clearTimeout(timer);
        // A connect abandoned by close() must not tear down the transport a later connect opened.
        if (this.transport === transport) this.detach();
        reject(error);
      };
      this.stopWatchingClose = transport.onClose(() => {
        if (this.transport !== transport) return;
        if (!this.joined) return fail(new Error("Lost the connection to the host"));
        this.detach();
        this.onConnectionLost?.();
      });
      this.stopListening = transport.onMessage((message) => {
        if (message.to !== this.request.clientId) return;
        if (!this.joined) {
          if (message.type === "joinRefused") return fail(new JoinRefusedError(message.reason));
          if (message.type !== "snapshot") return;
          clearTimeout(timer);
          this.joined = true;
          this.seat = message.localPlayerId;
          this.lastSeq = message.seq;
          resolve({ seq: message.seq, state: message.state, localPlayerId: message.localPlayerId });
          return;
        }
        this.receive(message);
      });
      transport.send({ type: "join", ...this.request });
    });
  }

  send(command: GameCommand): Promise<CommandResult> {
    const transport = this.transport;
    if (!transport || !this.joined) return Promise.reject(new Error("Not connected to the host"));
    const requestId = this.nextRequestId++;
    return new Promise<CommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("The host did not answer the command"));
      }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      transport.send({ type: "command", clientId: this.request.clientId, requestId, command });
    });
  }

  subscribe(listener: GameUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Seat list and spectator count, refreshed on every join and leave (lobby and seat picker). */
  subscribePresence(listener: (presence: Presence) => void): () => void {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  /** The host ended the match or gave this seat away; the screen decides what to show. */
  onClosed(listener: (reason: "HOST_CLOSED" | "SEAT_RELEASED") => void): void {
    this.onClosedByHost = listener;
  }

  /** The link dropped under a joined client; pending sends are already rejected and connect() may retry. */
  onLost(listener: () => void): void {
    this.onConnectionLost = listener;
  }

  /** Asks for whatever came after the last applied seq (also sent on its own when a seq is skipped). */
  resync(): void {
    this.transport?.send({ type: "resync", clientId: this.request.clientId, sinceSeq: this.lastSeq });
  }

  close(): void {
    this.transport?.send({ type: "leave", clientId: this.request.clientId });
    this.detach();
    this.listeners.clear();
  }

  private receive(message: HostMessage): void {
    switch (message.type) {
      case "update":
        if (message.seq <= this.lastSeq) return;
        // A gap means an update got lost: drop the rest until the host replays from lastSeq.
        if (message.seq > this.lastSeq + 1) return this.resync();
        this.lastSeq = message.seq;
        this.listeners.forEach((listener) =>
          listener({ seq: message.seq, state: message.state, events: message.events }),
        );
        return;
      case "snapshot":
        this.seat = message.localPlayerId;
        if (message.seq <= this.lastSeq) return;
        this.lastSeq = message.seq;
        this.listeners.forEach((listener) => listener({ seq: message.seq, state: message.state, events: [] }));
        return;
      case "commandResult": {
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        clearTimeout(pending.timer);
        const { result } = message;
        if (result.ok) return pending.resolve(result);
        if (isHostErrorCode(result.code)) return pending.reject(new HostRefusedError(result.code));
        return pending.resolve({ ok: false, code: result.code });
      }
      case "presence": {
        const presence = { seats: message.seats, spectators: message.spectators };
        this.latestPresence = presence;
        this.presenceListeners.forEach((listener) => listener(presence));
        return;
      }
      case "closed": {
        const listener = this.onClosedByHost;
        this.detach();
        listener?.(message.reason);
        return;
      }
      case "joinRefused":
        return;
    }
  }

  private detach(): void {
    this.stopWatchingClose?.();
    this.stopWatchingClose = null;
    this.stopListening?.();
    this.stopListening = null;
    this.transport?.close();
    this.transport = null;
    this.joined = false;
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error("Disconnected from the host"));
    }
    this.pending.clear();
  }
}
