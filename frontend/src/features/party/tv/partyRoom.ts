import type { MatchHost, SeatPresence } from "@/game/application/party";
import type { PlayerId } from "@/game/domain/core/ids";

export interface TvSeat extends SeatPresence {
  /** The name the seat's phone last joined with; kept after it drops, for "<nome> desconectou". */
  lastController: string | null;
  /** The computer plays it (MatchHost.setComputer). */
  computer: boolean;
}

export interface PartyRoomSnapshot {
  /** Null while closed (before the effect opens it, or after unmount). */
  host: MatchHost | null;
  seats: readonly TvSeat[];
}

const CLOSED: PartyRoomSnapshot = { host: null, seats: [] };

export const everySeatTaken = (seats: readonly TvSeat[]): boolean =>
  seats.length > 0 && seats.every((seat) => seat.controllerName !== null);

/** The screen's effect opens and closes the host, so React's dev double mount never leaves a second one answering. */
export class PartyRoom {
  private snapshot: PartyRoomSnapshot = CLOSED;
  private readonly lastController = new Map<PlayerId, string>();
  private readonly listeners = new Set<() => void>();
  private stop: (() => void) | null = null;

  constructor(private readonly createHost: () => MatchHost) {}

  open = (): void => {
    this.close();
    const host = this.createHost();
    const unsubscribe = host.subscribe(() => this.refresh(host));
    this.stop = () => {
      unsubscribe();
      host.close();
    };
    this.refresh(host);
  };

  close = (): void => {
    this.stop?.();
    this.stop = null;
    if (this.snapshot === CLOSED) return;
    this.snapshot = CLOSED;
    this.notify();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PartyRoomSnapshot => this.snapshot;

  private refresh(host: MatchHost): void {
    const computers = host.computerSeats;
    const seats = host.seats().map((seat) => {
      const computer = computers.includes(seat.playerId);
      if (seat.controllerName !== null && !computer) this.lastController.set(seat.playerId, seat.controllerName);
      return { ...seat, computer, lastController: this.lastController.get(seat.playerId) ?? null };
    });
    this.snapshot = { host, seats };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
