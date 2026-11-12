import type { PlayerId } from "@/game/domain/types";

/** The bits of Storage used here, so tests can pass a plain object. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The seat this phone took, so a refresh goes straight back to it. */
export interface SavedSeat {
  room: string;
  seat: PlayerId;
  name: string;
}

/** The browser's storage, looked up on each call: merely reading `window.localStorage` can throw. */
export function browserStore(kind: "sessionStorage" | "localStorage"): KeyValueStore {
  return {
    getItem: (key) => window[kind].getItem(key),
    setItem: (key, value) => window[kind].setItem(key, value),
    removeItem: (key) => window[kind].removeItem(key),
  };
}

const CLIENT_KEY = "battle-dice:party:client";
const SEAT_KEY = "battle-dice:party:seat";
const NAME_KEY = "battle-dice:party:name";

/** Per tab (sessionStorage): two tabs of one browser are two phones, but a refresh keeps the id and the seat. */
export function controllerId(store: KeyValueStore, create: () => string = newClientId): string {
  const saved = safely(() => store.getItem(CLIENT_KEY));
  if (saved) return saved;
  const id = create();
  safely(() => store.setItem(CLIENT_KEY, id));
  return id;
}

export function savedSeat(store: KeyValueStore, room: string): SavedSeat | null {
  const raw = safely(() => store.getItem(SEAT_KEY));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSeat>;
    if (parsed.room !== room || typeof parsed.seat !== "string" || typeof parsed.name !== "string") return null;
    return { room: parsed.room, seat: parsed.seat, name: parsed.name };
  } catch {
    return null;
  }
}

export function saveSeat(store: KeyValueStore, seat: SavedSeat | null): void {
  safely(() => (seat ? store.setItem(SEAT_KEY, JSON.stringify(seat)) : store.removeItem(SEAT_KEY)));
}

/** The last name typed, to prefill the next join (kept across tabs by passing localStorage). */
export function savedName(store: KeyValueStore): string {
  return safely(() => store.getItem(NAME_KEY)) ?? "";
}

export function saveName(store: KeyValueStore, name: string): void {
  safely(() => store.setItem(NAME_KEY, name));
}

// randomUUID exists only on https or localhost; a phone opening the TV's LAN address over http has just getRandomValues.
function newClientId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Private windows and blocked site data throw on access; the phone still works, it just forgets.
function safely<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}
