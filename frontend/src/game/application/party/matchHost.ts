import type { GameCommand } from "../../domain/core/commands";
import { applyCommand, type GameTransition } from "../../domain/core/engine";
import type { PlayerId } from "../../domain/core/ids";
import { projectEvents, projectState } from "../../domain/core/projection";
import type { GameState } from "../../domain/types";
import type { CommandResult, GameUpdate } from "../gameClient";
import { LocalGameClient } from "../localGameClient";
import type { ControllerMessage, HostMessage, JoinMessage, SeatPresence, WireCommandResult } from "./protocol";
import type { HostTransport } from "./transport";

/** What the seat list shows for a computer seat. */
export const COMPUTER_NAME = "Bot";

type Resolve = (state: GameState, command: GameCommand) => GameTransition;

export interface MatchHostOptions {
  /** Who may send `restart`: only the host screen (`host.restart()`), or any seated controller too. */
  restart?: "host" | "anyone";
  /** Accepted updates kept to replay a resync; older gaps get a fresh snapshot instead. */
  historySize?: number;
  /** Loaded dice for tests. */
  resolve?: Resolve;
}

interface Client {
  seat: PlayerId | null;
  name: string | null;
  character: string | null;
}

/**
 * Authoritative end of a party match: runs the rules through a LocalGameClient, hands out seats and sends each
 * client only what its seat may see. A room server takes exactly this role (see party README section).
 */
export class MatchHost {
  private readonly game: LocalGameClient;
  private readonly clients = new Map<string, Client>();
  /** Seats the computer plays, driven by the host screen; no phone may take them. */
  private readonly computers = new Set<PlayerId>();
  private readonly history: GameUpdate[] = [];
  private readonly listeners = new Set<() => void>();
  private current: GameState;
  private lastSeq = 0;
  private readonly stopListening: () => void;
  private readonly stopGame: () => void;
  private readonly restartPolicy: "host" | "anyone";
  private readonly historySize: number;

  constructor(
    state: GameState,
    private readonly transport: HostTransport,
    { restart = "host", historySize = 64, resolve = applyCommand }: MatchHostOptions = {},
  ) {
    this.current = state;
    this.restartPolicy = restart;
    this.historySize = historySize;
    this.game = new LocalGameClient(state, resolve);
    this.stopGame = this.game.subscribe(this.broadcast);
    this.stopListening = transport.onMessage(this.receive);
  }

  /** The full, unprojected state: for the host's own bookkeeping, never for a screen. */
  get state(): GameState {
    return this.current;
  }

  get seq(): number {
    return this.lastSeq;
  }

  /** Each seat and who holds it, as sent in presence. */
  seats(): SeatPresence[] {
    return this.current.players.map((player) => {
      if (this.computers.has(player.id))
        return { playerId: player.id, playerName: player.name, controllerName: COMPUTER_NAME, character: null };
      const holder = [...this.clients.values()].find(({ seat }) => seat === player.id);
      return {
        playerId: player.id,
        playerName: player.name,
        controllerName: holder ? (holder.name ?? player.name) : null,
        character: holder?.character ?? null,
      };
    });
  }

  get spectators(): number {
    return [...this.clients.values()].filter(({ seat }) => seat === null).length;
  }

  /** Called on every join, leave and accepted command, for a host screen showing the lobby. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Frees a seat whose phone vanished without a leave, so another phone can take it. */
  releaseSeat(playerId: PlayerId): void {
    for (const [clientId, client] of this.clients) {
      if (client.seat !== playerId) continue;
      this.clients.delete(clientId);
      this.post({ type: "closed", to: clientId, reason: "SEAT_RELEASED" });
    }
    this.changed();
  }

  get computerSeats(): PlayerId[] {
    return [...this.computers];
  }

  /** Hands a seat to the computer (freeing any phone on it) or back to the phones. */
  setComputer(playerId: PlayerId, computer: boolean): void {
    if (!this.current.players.some(({ id }) => id === playerId)) return;
    if (!computer) {
      this.computers.delete(playerId);
      return this.changed();
    }
    this.computers.add(playerId);
    this.releaseSeat(playerId);
  }

  /** A move for one of the computer's seats, sent by the host screen's bot driver. */
  async sendAsComputer(command: GameCommand): Promise<WireCommandResult> {
    if (command.type === "restart" || !this.computers.has(command.playerId))
      return { ok: false, code: "NOT_YOUR_SEAT" };
    return this.game.send(command);
  }

  restart(): Promise<CommandResult> {
    return this.game.send({ type: "restart" });
  }

  close(): void {
    for (const clientId of this.clients.keys()) this.post({ type: "closed", to: clientId, reason: "HOST_CLOSED" });
    this.clients.clear();
    this.stopListening();
    this.stopGame();
    this.listeners.clear();
    this.transport.close();
  }

  private receive = (message: ControllerMessage): void => {
    switch (message.type) {
      case "join":
        return this.join(message);
      case "command":
        void this.command(message.clientId, message.requestId, message.command);
        return;
      case "resync":
        return this.resync(message.clientId, message.sinceSeq);
      case "leave":
        if (this.clients.delete(message.clientId)) this.changed();
        return;
    }
  };

  private join({ clientId, role, seat, name, character }: JoinMessage): void {
    const previous = this.clients.get(clientId);
    let assigned: PlayerId | null = null;
    if (role === "player") {
      const holderOf = (id: PlayerId) =>
        this.computers.has(id) ||
        [...this.clients.entries()].some(([other, client]) => other !== clientId && client.seat === id);
      if (seat !== undefined) {
        if (!this.current.players.some(({ id }) => id === seat)) return this.refuse(clientId, "UNKNOWN_SEAT");
        if (holderOf(seat)) return this.refuse(clientId, "SEAT_TAKEN");
        assigned = seat;
      } else {
        const kept = previous?.seat && !holderOf(previous.seat) ? previous.seat : null;
        assigned = kept ?? this.current.players.find(({ id }) => !holderOf(id))?.id ?? null;
        if (assigned === null) return this.refuse(clientId, "ROOM_FULL");
      }
    }
    this.clients.set(clientId, { seat: assigned, name: name ?? null, character: character ?? null });
    this.post({
      type: "snapshot",
      to: clientId,
      seq: this.lastSeq,
      state: projectState(this.current, assigned),
      localPlayerId: assigned,
    });
    this.changed();
  }

  private refuse(clientId: string, reason: "ROOM_FULL" | "SEAT_TAKEN" | "UNKNOWN_SEAT"): void {
    this.post({ type: "joinRefused", to: clientId, reason });
  }

  private async command(clientId: string, requestId: number, command: GameCommand): Promise<void> {
    const result = await this.check(this.clients.get(clientId), command);
    this.post({ type: "commandResult", to: clientId, requestId, result });
  }

  private check(client: Client | undefined, command: GameCommand): WireCommandResult | Promise<CommandResult> {
    if (command.type === "restart") {
      if (this.restartPolicy !== "anyone" || !client?.seat) return { ok: false, code: "RESTART_NOT_ALLOWED" };
    } else if (!client?.seat) {
      return { ok: false, code: "NOT_SEATED" };
    } else if (command.playerId !== client.seat) {
      return { ok: false, code: "NOT_YOUR_SEAT" };
    }
    return this.game.send(command);
  }

  private resync(clientId: string, sinceSeq: number): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    const missed = this.history.filter(({ seq }) => seq > sinceSeq);
    const replayable = missed.length === this.lastSeq - sinceSeq && sinceSeq <= this.lastSeq;
    if (!replayable) {
      this.post({
        type: "snapshot",
        to: clientId,
        seq: this.lastSeq,
        state: projectState(this.current, client.seat),
        localPlayerId: client.seat,
      });
      return;
    }
    missed.forEach((update) => this.post(this.updateFor(clientId, client.seat, update)));
  }

  private broadcast = (update: GameUpdate): void => {
    this.current = update.state;
    this.lastSeq = update.seq;
    this.history.push(update);
    if (this.history.length > this.historySize) this.history.shift();
    for (const [clientId, { seat }] of this.clients) this.post(this.updateFor(clientId, seat, update));
    this.listeners.forEach((listener) => listener());
  };

  private updateFor(to: string, seat: PlayerId | null, { seq, state, events }: GameUpdate): HostMessage {
    return { type: "update", to, seq, state: projectState(state, seat), events: projectEvents(events, seat) };
  }

  private changed(): void {
    const seats = this.seats();
    const spectators = this.spectators;
    for (const clientId of this.clients.keys()) this.post({ type: "presence", to: clientId, seats, spectators });
    this.listeners.forEach((listener) => listener());
  }

  private post(message: HostMessage): void {
    this.transport.send(message);
  }
}
