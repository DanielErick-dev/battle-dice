import type { LogLines } from "./lines";

const leftOut = () => null;

/** What the log leaves out: walks, draws, prompts and fades. */
export const silentLines: LogLines<
  | "playerMoved"
  | "cardDrawn"
  | "deckReshuffled"
  | "discardRequired"
  | "wardOffered"
  | "graceOffered"
  | "plunderOffered"
  | "voidFed"
  | "winterSpread"
  | "flamesFaded"
  | "scarletFaded"
  | "trapUnpinned"
  | "gameRestarted"
> = {
  playerMoved: leftOut,
  cardDrawn: leftOut,
  deckReshuffled: leftOut,
  discardRequired: leftOut,
  wardOffered: leftOut,
  graceOffered: leftOut,
  plunderOffered: leftOut,
  voidFed: leftOut,
  winterSpread: leftOut,
  flamesFaded: leftOut,
  scarletFaded: leftOut,
  trapUnpinned: leftOut,
  gameRestarted: leftOut,
};
