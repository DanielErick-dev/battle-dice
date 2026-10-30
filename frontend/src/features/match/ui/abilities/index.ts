/**
 * The abilities that ask something before going off: whom to aim at, which power, which cards or
 * tiles. The match screen only asks this registry what "Usar" does and which picker to show; a new
 * ability that asks something gets its own file here and one line below (see docs/arquitetura.md).
 */
import type { AbilityId } from "@/game/domain/abilities";
import { arrowRain } from "./arrowRain";
import { resurrection, transmutation } from "./cardChoices";
import { cardGamble } from "./cardGamble";
import { hellsDrag } from "./hellsDrag";
import { ocularAwakening } from "./ocularAwakening";
import { fairyBloom, forbiddenSeals, spectralApparitions, theVoid } from "./placements";
import { timeWarp } from "./timeWarp";
import type { AbilityFlow } from "./types";

export const ABILITY_FLOWS: Partial<Readonly<Record<AbilityId, AbilityFlow>>> = {
  arrowRain,
  cardGamble,
  fairyBloom,
  forbiddenSeals,
  hellsDrag,
  ocularAwakening,
  resurrection,
  spectralApparitions,
  theVoid,
  timeWarp,
  transmutation,
};

export { placementOf } from "./placements";
export type { AbilityContext, AbilityScene, Placement } from "./types";
