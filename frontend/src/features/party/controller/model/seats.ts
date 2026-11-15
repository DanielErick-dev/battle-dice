import type { JoinRefusal, Presence } from "@/game/application/party";
import type { PlayerId } from "@/game/domain/types";
import { characterFor, playerColor } from "@/features/characters";
import { parseRoomCode } from "@/features/shared/party/roomCode";

/** One seat on the join screen. */
export interface SeatOption {
  playerId: PlayerId;
  /** The in-game player name ("Bruxa", "Bruxa 2"). */
  playerName: string;
  /** Character name and title, when the player id names one (see rosterOf). */
  character: { name: string; epithet: string } | null;
  color: string;
  /** Who holds it (their join name); null while free. */
  takenBy: string | null;
}

/** The room's seats as the phone shows them, from the latest presence. */
export function seatOptions(presence: Presence | null): SeatOption[] {
  return (presence?.seats ?? []).map((seat) => {
    const character = characterFor(seat.playerId);
    return {
      playerId: seat.playerId,
      playerName: seat.playerName,
      character: character ? { name: character.name, epithet: character.epithet } : null,
      color: playerColor(seat.playerId),
      takenBy: seat.controllerName,
    };
  });
}

/** "kp-rw " → "KPRW": typed on a phone keyboard, so spaces and dashes are forgiven; null when it can't be a code. */
export function roomCodeFrom(typed: string): string | null {
  return parseRoomCode(typed.replace(/[\s-]/g, ""));
}

const REFUSALS: Readonly<Record<JoinRefusal, string>> = {
  ROOM_FULL: "A sala está cheia: todos os lugares já têm dono.",
  SEAT_TAKEN: "Alguém pegou esse lugar antes de você. Escolha outro.",
  UNKNOWN_SEAT: "Esse lugar não existe nesta partida. Escolha outro.",
};

/** A refused join in words; anything else (no answer) means the room isn't open. */
export function joinRefusalMessage(reason: JoinRefusal | null): string {
  return reason
    ? REFUSALS[reason]
    : "Nenhuma sala respondeu com esse código. Confira o código na TV e se o celular está no mesmo Wi-Fi.";
}
