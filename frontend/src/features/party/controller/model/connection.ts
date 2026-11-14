import type { CommandResult, GameClient, GameUpdateListener, Snapshot } from "@/game/application/gameClient";
import { HostRefusedError, JoinRefusedError, type JoinRefusal, type RemoteGameClient } from "@/game/application/party";
import type { GameCommand } from "@/game/domain/core/commands";
import { MatchStore } from "@/features/match/model/matchStore";

/** Where the phone's link to the room stands; the screen shows one state per kind. */
export type ConnectionStatus =
  | { kind: "connecting" }
  | { kind: "live" }
  /** Was live and lost the room: retrying on its own. */
  | { kind: "reconnecting"; attempt: number }
  /** The very first join failed: refused (`reason`) or nobody answered (null). */
  | { kind: "failed"; reason: JoinRefusal | null }
  /** Over for this phone: the host ended the match, freed the seat, or someone took it while we were away. */
  | { kind: "closed"; reason: "HOST_CLOSED" | "SEAT_RELEASED" | "SEAT_LOST" };

export interface ControllerConnectionOptions {
  /** Pause between reconnect attempts. */
  retryMs?: number;
}

/** Passes everything through, but reports a send that never got an answer: the room is gone, not the rules. */
class WatchedClient implements GameClient {
  constructor(
    private readonly inner: GameClient,
    private readonly onLost: () => void,
  ) {}

  connect(): Promise<Snapshot> {
    return this.inner.connect();
  }

  send(command: GameCommand): Promise<CommandResult> {
    return this.inner.send(command).catch((error: unknown) => {
      if (!(error instanceof HostRefusedError)) this.onLost();
      throw error;
    });
  }

  subscribe(listener: GameUpdateListener): () => void {
    return this.inner.subscribe(listener);
  }

  close(): void {
    this.inner.close();
  }
}

/** A seated phone's MatchStore plus its room link; rejoins the same seat when the room goes quiet. */
export class ControllerConnection {
  readonly store: MatchStore;
  private status: ConnectionStatus = { kind: "connecting" };
  private readonly listeners = new Set<() => void>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private wasLive = false;
  /** Bumped on each open, so only the latest one's outcome counts. */
  private attempts = 0;
  private disposed = false;
  private readonly retryMs: number;

  constructor(
    private readonly client: RemoteGameClient,
    { retryMs = 3000 }: ControllerConnectionOptions = {},
  ) {
    this.retryMs = retryMs;
    this.store = new MatchStore(new WatchedClient(client, this.lost));
    client.onClosed((reason) => this.finish(reason));
    client.onLost(this.lost);
  }

  getStatus = (): ConnectionStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Joins the room; may follow a dispose (React's strict mode mounts twice). */
  start = (): void => {
    this.disposed = false;
    void this.open();
  };

  /** Catches up on whatever was missed (the phone slept or the tab was hidden); harmless when nothing was. */
  resync = (): void => {
    if (this.status.kind === "live") this.client.resync();
  };

  /** Retries right away instead of waiting for the next attempt. */
  retryNow = (): void => {
    if (this.status.kind !== "reconnecting") return;
    this.clearRetry();
    void this.open();
  };

  dispose = (): void => {
    this.disposed = true;
    this.clearRetry();
    this.store.close();
  };

  private async open(): Promise<void> {
    const attempt = ++this.attempts;
    const stale = () => attempt !== this.attempts || this.disposed || this.status.kind === "closed";
    try {
      await this.store.open();
      if (stale()) return;
      this.wasLive = true;
      this.setStatus({ kind: "live" });
    } catch (error) {
      if (stale()) return;
      const refusal = error instanceof JoinRefusedError ? error.reason : null;
      if (!this.wasLive) return this.setStatus({ kind: "failed", reason: refusal });
      // Our seat went to another phone while we were away: nothing left to rejoin.
      if (refusal) return this.finish("SEAT_LOST");
      this.scheduleRetry();
    }
  }

  private lost = (): void => {
    if (this.disposed || this.status.kind !== "live") return;
    this.store.close();
    this.scheduleRetry();
  };

  private scheduleRetry(): void {
    const attempt = this.status.kind === "reconnecting" ? this.status.attempt + 1 : 1;
    this.setStatus({ kind: "reconnecting", attempt });
    this.clearRetry();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.open();
    }, this.retryMs);
  }

  private finish(reason: "HOST_CLOSED" | "SEAT_RELEASED" | "SEAT_LOST"): void {
    if (this.disposed) return;
    this.clearRetry();
    this.store.close();
    this.setStatus({ kind: "closed", reason });
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
}
