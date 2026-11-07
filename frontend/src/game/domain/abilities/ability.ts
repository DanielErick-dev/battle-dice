/** Each charges one step per own turn started, stays ready until used, and empties when used. */
export type AbilityId =
  | "doubleCast" // two cards this turn
  | "theVoid" // Zarek's: swallows the harm he stops on when offered, sets it down anew (characters/zarek/)
  | "tailwind" // this turn's roll walks TAILWIND_BONUS further
  | "fireZone" // Akane's: sets the tiles ahead alight; Brilliant Impetus is his passive (characters/akane/)
  | "seraphBlessing" // a random heaven blessing or heaven card (characters/seraphiel/)
  | "hellsDrag" // the Fallen Angel pulls an opponent into hell; alone, hell swallows traps ahead
  | "cleansingTide" // clears every spell off the TIDE_RANGE tiles ahead, whoever cast it
  | "untamed" // nothing harms the Berserker for a while; trampling is his passive (characters/bjorn/)
  | "silentVerdict" // Themis's: armed once charged, turns what's aimed at her on the attacker (characters/themis/)
  | "timeWarp" // halts or reverses an opponent on the same tile; alone, an extra turn
  | "plasmaCannon" // blasts traps ahead and knocks the leading opponent back
  | "levitation" // no tile does anything to the player, blessings and portals included
  | "transmutation" // characters/alchemist/
  | "dormantFury" // this turn's roll times DORMANT_FURY_MULTIPLIER, card modifiers included
  | "arrowRain" // characters/archer/
  | "cardGamble" // characters/jester/
  | "resurrection" // characters/necromancer/
  | "forbiddenSeals" // characters/scribe/
  | "spectralApparitions" // characters/warden/
  | "fairyBloom" // characters/fairy/
  | "ocularAwakening" // black fire or Spectral Armour, characters/kage/
  | "weeding"; // Vinicius's: passive, he hoes out any trap he stops on (characters/vinicius/)

/** Ocular Awakening's flames or armour, Time Warp's halt or reverse, Card Gamble's "fortune" (thrown for cards). */
export type AbilityPower = "flames" | "armour" | "halt" | "reverse" | "fortune";

export function needsDiscardChoice(ability: AbilityId | null): boolean {
  return ability === "resurrection";
}

/** Offered by the board rather than used from the button (the Void's stealing aside, see abilityBlocker). */
export function isReactive(ability: AbilityId): boolean {
  return ability === "theVoid" || ability === "silentVerdict";
}

/** Always on, nothing to charge or use. */
export function isPassive(ability: AbilityId | null): boolean {
  return ability === "weeding";
}
