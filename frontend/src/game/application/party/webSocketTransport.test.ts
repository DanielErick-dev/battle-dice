import { describe, expect, it } from "vitest";
import { type SocketLike, WebSocketTransport } from "./webSocketTransport";

class FakeSocket implements SocketLike {
  readyState = 0;
  readonly sent: string[] = [];
  private readonly handlers = new Map<string, ((event: { data: unknown }) => void)[]>();

  addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.emit("close");
  }
  emit(type: string, data?: unknown): void {
    if (type === "open") this.readyState = 1;
    this.handlers.get(type)?.forEach((listener) => listener({ data }));
  }
}

function setup() {
  const socket = new FakeSocket();
  const transport = new WebSocketTransport<{ n: number }, { m: string }>("ws://x", () => socket);
  return { socket, transport };
}

describe("WebSocketTransport", () => {
  it("queues sends until the socket opens, then sends them in order", () => {
    const { socket, transport } = setup();
    transport.send({ n: 1 });
    transport.send({ n: 2 });
    expect(socket.sent).toEqual([]);
    socket.emit("open");
    transport.send({ n: 3 });
    expect(socket.sent).toEqual(['{"n":1}', '{"n":2}', '{"n":3}']);
  });

  it("parses incoming JSON for every listener", () => {
    const { socket, transport } = setup();
    const got: string[] = [];
    transport.onMessage((message) => got.push(message.m));
    socket.emit("message", '{"m":"oi"}');
    expect(got).toEqual(["oi"]);
  });

  it("reports a drop, but not a close it asked for itself", () => {
    const dropped = setup();
    let drops = 0;
    dropped.transport.onClose(() => drops++);
    dropped.socket.emit("close");
    expect(drops).toBe(1);

    const closed = setup();
    closed.transport.onClose(() => drops++);
    closed.transport.close();
    expect(drops).toBe(1);
  });
});
