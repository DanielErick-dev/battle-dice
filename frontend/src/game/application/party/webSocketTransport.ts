import type { Transport } from "./transport";

/** The slice of the browser WebSocket this transport uses, so tests can hand it a fake. */
export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: "open" | "close", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

const OPEN = 1;

/** A Transport over one WebSocket: JSON in and out, sends queued until the socket opens. */
export class WebSocketTransport<Out, In> implements Transport<Out, In> {
  private readonly socket: SocketLike;
  private readonly queue: string[] = [];
  private readonly listeners = new Set<(message: In) => void>();
  private readonly closeListeners = new Set<() => void>();
  private closedByUs = false;

  constructor(url: string, openSocket: (url: string) => SocketLike = (target) => new WebSocket(target)) {
    this.socket = openSocket(url);
    this.socket.addEventListener("open", () => this.queue.splice(0).forEach((data) => this.socket.send(data)));
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(String(data)) as In;
      this.listeners.forEach((listener) => listener(message));
    });
    this.socket.addEventListener("close", () => {
      if (!this.closedByUs) this.closeListeners.forEach((listener) => listener());
    });
  }

  send(message: Out): void {
    const data = JSON.stringify(message);
    if (this.socket.readyState === OPEN) this.socket.send(data);
    else this.queue.push(data);
  }

  onMessage(listener: (message: In) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  close(): void {
    this.closedByUs = true;
    this.listeners.clear();
    this.closeListeners.clear();
    this.socket.close();
  }
}
