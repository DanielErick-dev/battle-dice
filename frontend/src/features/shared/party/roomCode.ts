import { pick } from "../collections/items";

/** No I, L, O, Q, U, V or 0/1-lookalikes: read off a TV across the room and typed on a phone. */
export const ROOM_LETTERS = "ABCDEFGHJKMNPRSTWXYZ";

export const ROOM_CODE_LENGTH = 4;

/** A fresh room code such as "KPRW"; `draw` returns numbers in [0, 1). */
export function newRoomCode(draw: () => number = Math.random, length = ROOM_CODE_LENGTH): string {
  return Array.from({ length }, () => pick(ROOM_LETTERS, draw())).join("");
}

/** The code as typed or read from a URL, uppercased; null when it can't be one we hand out. */
export function parseRoomCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  const valid = code.length >= 4 && code.length <= 5 && [...code].every((letter) => ROOM_LETTERS.includes(letter));
  return valid ? code : null;
}
