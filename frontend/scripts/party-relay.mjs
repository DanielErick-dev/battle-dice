// Throwaway dev relay for party mode across devices: replaced by the FastAPI room server (docs/backend-plano.md).
// ws://<host>:3002/salas/<code>?lado=host|controle — host messages go to every controller, controller messages to the host.
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PARTY_RELAY_PORT ?? 3002);
/** @type {Map<string, { host: Set<import("ws").WebSocket>, controle: Set<import("ws").WebSocket> }>} */
const rooms = new Map();

const server = new WebSocketServer({ port: PORT });

server.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", "http://relay");
  const match = url.pathname.match(/^\/salas\/([A-Za-z0-9]+)$/);
  const side = url.searchParams.get("lado") === "host" ? "host" : "controle";
  if (!match) return socket.close(1008, "path must be /salas/<code>");
  const code = match[1].toUpperCase();
  const room = rooms.get(code) ?? { host: new Set(), controle: new Set() };
  rooms.set(code, room);
  room[side].add(socket);
  console.log(`[relay] ${code}: ${side} in (${room.host.size} host, ${room.controle.size} controle)`);

  socket.on("message", (data) => {
    const targets = side === "host" ? room.controle : room.host;
    for (const target of targets) if (target.readyState === target.OPEN) target.send(data.toString());
  });
  socket.on("close", () => {
    room[side].delete(socket);
    if (room.host.size === 0 && room.controle.size === 0) rooms.delete(code);
    console.log(`[relay] ${code}: ${side} out`);
  });
});

console.log(`[relay] party relay on ws://0.0.0.0:${PORT}/salas/<code>`);
