import { preloadProps, type PropId } from "../core/props";

/** The shared `rest` clip keeps the hips this high off the floor (FIGURE_HEIGHT units): every seat's top sits just under them. */
export const SEAT_TOP = 0.74;

/**
 * A character's own chair (a Meshy model, see PROPS): how tall to draw it so its seat meets the
 * hips (SEAT_TOP), how far its middle sits from the hips (+z ahead) and how far round it's turned
 * to face the way the figure does.
 */
export interface ChairModel {
  prop: PropId;
  height: number;
  z: number;
  turn: number;
}
export const CHAIRS = {
  // The Crystal Fairy's throne of ice and fur: its cushion's top is halfway up the model.
  frostThrone: { prop: "frostThrone", height: SEAT_TOP * 2, z: 0.05, turn: 0 },
  // Akane's throne of black stone and flames: a low seat, under a third of the way up the model.
  infernalThrone: {
    prop: "infernalThrone",
    height: SEAT_TOP / 0.31,
    z: 0.05,
    turn: 0,
  },
  // Bjorn's throne of ice under a wolf's head: its seat is a little over a quarter of the way up.
  wolfThrone: { prop: "wolfThrone", height: SEAT_TOP / 0.275, z: 0.05, turn: 0 },
  // Seraphiel's throne of gold and light on its dais, and the ashen one he sits on once fallen.
  celestialThrone: { prop: "celestialThrone", height: SEAT_TOP / 0.3, z: 0.05, turn: 0 },
  ashenThrone: { prop: "ashenThrone", height: SEAT_TOP / 0.335, z: 0.05, turn: 0 },
  // Cronos's brass throne of gears: its seat sits further forward, so it's pulled back.
  clockworkThrone: { prop: "clockworkThrone", height: SEAT_TOP / 0.35, z: -0.14, turn: 0 },
  // Unidade Alva's cybernetic throne.
  cyberThrone: { prop: "cyberThrone", height: SEAT_TOP / 0.32, z: -0.03, turn: 0 },
  // Kage Rubra's throne of obsidian and red fire: a low seat, a little forward.
  obsidianThrone: { prop: "obsidianThrone", height: SEAT_TOP / 0.26, z: -0.06, turn: 0 },
  // The Elven Archer's throne of living wood.
  elderwoodThrone: { prop: "elderwoodThrone", height: SEAT_TOP / 0.33, z: 0.05, turn: 0 },
  // Auric's throne of coral and tide.
  tideThrone: { prop: "tideThrone", height: SEAT_TOP / 0.365, z: 0.05, turn: 0 },
  // The Ancient Monk's storm-forged throne of stone and metal.
  stormThrone: { prop: "stormThrone", height: SEAT_TOP / 0.33, z: 0.08, turn: 0 },
  // The Crimson Witch's red throne: a deep one, its seat well behind the middle, so it's pushed forward.
  crimsonThrone: { prop: "crimsonThrone", height: SEAT_TOP / 0.35, z: 0.33, turn: 0 },
  // The Card Jester's black and red throne.
  jesterThrone: { prop: "jesterThrone", height: SEAT_TOP / 0.345, z: 0.08, turn: 0 },
  // The Flesh Scribe's crimson throne wrapped in bandages and blood-rune scrolls.
  scribeThrone: { prop: "scribeThrone", height: SEAT_TOP / 0.33, z: 0.1, turn: 0 },
  // The Emerald Alchemist's throne of glass and brass (1.2 MB: Meshy's UV islands stop the simplifier).
  alchemistThrone: { prop: "alchemistThrone", height: SEAT_TOP / 0.38, z: 0.05, turn: 0 },
  // The Necromancer's throne of black bone.
  necromancerThrone: { prop: "necromancerThrone", height: SEAT_TOP / 0.32, z: 0.1, turn: 0 },
  // Zéfiro's throne of the four elements.
  elementalThrone: { prop: "elementalThrone", height: SEAT_TOP / 0.31, z: 0.08, turn: 0 },
  // The Void Knight's throne of amethyst and shadow.
  amethystThrone: { prop: "amethystThrone", height: SEAT_TOP / 0.315, z: 0.08, turn: 0 },
  // Themis's pale blue throne.
  moonThrone: { prop: "moonThrone", height: SEAT_TOP / 0.305, z: 0.05, turn: 0 },
  // The Shadow Warden's throne of black stone: a low seat.
  shadowThrone: { prop: "shadowThrone", height: SEAT_TOP / 0.25, z: 0.08, turn: 0 },
  // The Crimson Enchantress's throne of red roses: its seat sits behind the middle, so it's pushed forward.
  roseThrone: { prop: "roseThrone", height: SEAT_TOP / 0.345, z: 0.28, turn: 0 },
} as const satisfies Record<string, ChairModel>;
export type ChairId = keyof typeof CHAIRS;

/** Starts fetching the given chairs' models (only the roster's, so a match doesn't download them all). */
export function preloadChairs(chairs: readonly ChairId[]): void {
  preloadProps(chairs.map((chair) => CHAIRS[chair].prop));
}

