import type { ControllerMessage, HostMessage } from "./protocol";

/** A message pipe; the host and every controller each hold one end. Swap the implementation, not the users. */
export interface Transport<Out, In> {
  /** Fire and forget: delivery problems surface as timeouts or a resync, not as errors here. */
  send(message: Out): void;
  onMessage(listener: (message: In) => void): () => void;
  close(): void;
}

export type HostTransport = Transport<HostMessage, ControllerMessage>;
export type ControllerTransport = Transport<ControllerMessage, HostMessage>;

type Side = "host" | "controller";

interface Envelope {
  from: Side;
  message: unknown;
}

/** Room code → channel name; rooms on the same browser never hear each other. */
export function partyChannelName(room: string): string {
  return `battle-dice:party:${room.trim().toUpperCase()}`;
}

/**
 * Same-browser stand-in for the room server: every tab of one browser on one channel. The envelope keeps
 * controllers from hearing each other's commands; each controller drops host messages not addressed `to` it.
 */
export class BroadcastChannelTransport<Out, In> implements Transport<Out, In> {
  private readonly channel: BroadcastChannel;
  private readonly listeners = new Set<(message: In) => void>();

  constructor(
    room: string,
    private readonly side: Side,
  ) {
    this.channel = new BroadcastChannel(partyChannelName(room));
    this.channel.onmessage = ({ data }: MessageEvent<Envelope>) => {
      if (data.from === this.side) return;
      this.listeners.forEach((listener) => listener(data.message as In));
    };
  }

  send(message: Out): void {
    this.channel.postMessage({ from: this.side, message } satisfies Envelope);
  }

  onMessage(listener: (message: In) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
    this.channel.close();
  }
}

export const hostChannel = (room: string): HostTransport => new BroadcastChannelTransport(room, "host");

export const controllerChannel = (room: string): ControllerTransport =>
  new BroadcastChannelTransport(room, "controller");
