export type Suit = "hearts" | "spades" | "diamonds" | "clubs";

/** Card faces in drawing order; the last is the deck's back. */
export const FACES: { rank: string; suit: Suit | "joker" }[] = [
  { rank: "A", suit: "hearts" },
  { rank: "K", suit: "spades" },
  { rank: "Q", suit: "diamonds" },
  { rank: "7", suit: "clubs" },
  { rank: "", suit: "joker" },
];
