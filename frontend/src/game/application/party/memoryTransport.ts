import type { ControllerMessage, HostMessage } from "./protocol";
import type { ControllerTransport, HostTransport } from "./transport";

/** A controller end of a MemoryRoom; `offline` drops what the host sends it, like a phone losing signal. */
export interface MemoryControllerTransport extends ControllerTransport {
  offline: boolean;
  /** Simulates the socket closing under the controller: fires onClose and leaves the room. */
  drop(): void;
}

/** JSON round-tripped so nothing that can't cross a real wire slips through in tests. */
export class MemoryRoom {
  private readonly hostListeners = new Set<(message: ControllerMessage) => void>();
  private readonly controllers = new Set<{ end: MemoryControllerTransport; deliver: (m: HostMessage) => void }>();
  /** Every message the host sent, for tests that check nothing leaked. */
  readonly sent: HostMessage[] = [];

  readonly host: HostTransport = {
    send: (message) => {
      const copy = wire(message);
      this.sent.push(copy);
      this.controllers.forEach(({ end, deliver }) => {
        if (!end.offline) deliver(copy);
      });
    },
    onMessage: (listener) => {
      this.hostListeners.add(listener);
      return () => this.hostListeners.delete(listener);
    },
    onClose: () => () => {},
    close: () => this.hostListeners.clear(),
  };

  connect(): MemoryControllerTransport {
    const listeners = new Set<(message: HostMessage) => void>();
    const closeListeners = new Set<() => void>();
    const entry = {
      end: {
        offline: false,
        send: (message: ControllerMessage) => {
          const copy = wire(message);
          this.hostListeners.forEach((listener) => listener(copy));
        },
        onMessage: (listener: (message: HostMessage) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        onClose: (listener: () => void) => {
          closeListeners.add(listener);
          return () => closeListeners.delete(listener);
        },
        close: () => {
          listeners.clear();
          closeListeners.clear();
          this.controllers.delete(entry);
        },
        drop: () => {
          this.controllers.delete(entry);
          closeListeners.forEach((listener) => listener());
          listeners.clear();
          closeListeners.clear();
        },
      },
      deliver: (message: HostMessage) => listeners.forEach((listener) => listener(message)),
    };
    this.controllers.add(entry);
    return entry.end;
  }
}

const wire = <T>(message: T): T => JSON.parse(JSON.stringify(message)) as T;
